import { Elysia, t } from "elysia";
import Redis from "ioredis";
import { buildMimc7 as buildMimc } from "circomlibjs";
import { MerkleTreeMiMC, MiMC7 } from "../lib/merkle-tree";
import { fetchTopOwners, Owner } from "../lib/simplehash";
import { verifyProofForCreate, verifyProofForDelete } from "../lib/proof";
import cors from "@elysiajs/cors";
import { Logestic } from "logestic";
import { createSignerForAddress, getSignerForAddress } from "@anon/db";
import { PostCastResponse } from "./types";
import crypto from "crypto";
import { TOKEN_CONFIG } from "../lib/config";

const zeroHex = "0x0000000000000000000000000000000000000000";

const redis = new Redis(process.env.REDIS_URL as string);

const app = new Elysia()
	.onError(({ server, error, path }) => {
		console.error(path, error);
		server?.stop();
		process.exit(1);
	})
	.use(cors().use(Logestic.preset("common")))
	.get(
		"/merkle-tree/:tokenAddress",
		({ params }) => fetchTree(params.tokenAddress),
		{
			params: t.Object({
				tokenAddress: t.String(),
			}),
		},
	)
	.get(
		"/merkle-tree/:tokenAddress/delete",
		({ params }) => fetchTree(params.tokenAddress, true),
		{
			params: t.Object({
				tokenAddress: t.String(),
			}),
		},
	)
	.post("/post", ({ body }) => submitPost(body.proof, body.publicInputs), {
		body: t.Object({
			proof: t.Array(t.Number()),
			publicInputs: t.Array(t.Array(t.Number())),
		}),
	})
	.get("/get-cast", ({ query }) => getCast(query.identifier), {
		query: t.Object({
			identifier: t.String(),
		}),
	})
	.post(
		"/update-signer",
		({ body }) => createSignerForAddress(body.address, body.signerUuid),
		{
			body: t.Object({
				address: t.String(),
				signerUuid: t.String(),
			}),
		},
	)
	.get("/validate-frame", ({ query }) => validateFrame(query.data), {
		query: t.Object({
			data: t.String(),
		}),
	})
	.get("/posts/:tokenAddress", ({ params }) => getPosts(params.tokenAddress), {
		params: t.Object({
			tokenAddress: t.String(),
		}),
	})
	.post(
		"/post/delete",
		({ body }) => deletePost(body.proof, body.publicInputs),
		{
			body: t.Object({
				proof: t.Array(t.Number()),
				publicInputs: t.Array(t.Array(t.Number())),
			}),
		},
	);

app.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

async function fetchTree(tokenAddress: string, isDelete?: boolean) {
	const data = await redis.get(
		`anon:tree:${tokenAddress}${isDelete ? ":delete" : ""}`,
	);
	if (data) {
		return JSON.parse(data);
	}

	const mimc = await buildMimc();
	const merkleTree = new MerkleTreeMiMC(11, mimc);

	const owners = await fetchOwners(tokenAddress, isDelete);
	for (const owner of owners) {
		const commitment = MiMC7(
			mimc,
			owner.owner_address.toLowerCase().replace("0x", ""),
			BigInt(owner.quantity_string).toString(16).replace("0x", ""),
		);
		merkleTree.insert(commitment);
	}

	const root = `0x${merkleTree.root()}`;

	const elements = owners.map((owner, index) => {
		return {
			path: merkleTree.proof(index).pathElements.map((p) => `0x${p}` as string),
			address: owner.owner_address.toLowerCase(),
			balance: owner.quantity_string,
		};
	});

	const tree = {
		root,
		elements,
	};

	await redis.set(
		`anon:tree:${tokenAddress}${isDelete ? ":delete" : ""}`,
		JSON.stringify(tree),
		"EX",
		60 * 5,
	);

	return tree;
}

async function fetchOwners(
	tokenAddress: string,
	isDelete?: boolean,
): Promise<Array<Owner>> {
	const data = await redis.get(
		`anon:owners:${tokenAddress}${isDelete ? ":delete" : ""}`,
	);
	if (data) {
		return JSON.parse(data);
	}

	const owners = await fetchTopOwners(tokenAddress, isDelete);
	await redis.set(
		`anon:owners:${tokenAddress}${isDelete ? ":delete" : ""}`,
		JSON.stringify(owners),
		"EX",
		60 * 5,
	);

	return owners;
}

async function submitPost(proof: number[], publicInputs: number[][]) {
	let isValid = false;
	try {
		isValid = await verifyProofForCreate(proof, publicInputs);
	} catch (e) {
		console.error(e);
	}

	if (!isValid) {
		throw new Error("Invalid proof");
	}

	const params = extractCreateData(publicInputs);

	const signerUuid = await getSignerForAddress(params.tokenAddress);

	const embeds: Array<{
		url?: string;
		castId?: { hash: string; fid: number };
	}> = params.embeds.map((embed) => ({
		url: embed,
	}));

	if (params.quote) {
		const quote = await getCast(params.quote);
		embeds.push({
			castId: {
				hash: quote.cast.hash,
				fid: quote.cast.author.fid,
			},
		});
	}

	let parentAuthorFid = undefined;
	if (params.parent) {
		const parent = await getCast(params.parent);
		parentAuthorFid = parent.cast.author.fid;
	}

	const body = {
		signer_uuid: signerUuid.signerUuid,
		parent: params.parent,
		parent_author_fid: parentAuthorFid,
		text: params.text,
		embeds,
	};

	const hash = crypto
		.createHash("sha256")
		.update(JSON.stringify(body))
		.digest("hex");

	const exists = await redis.get(`post:hash:${hash}`);
	if (exists) {
		console.log("Duplicate submission detected");
		return;
	}

	await redis.set(`post:hash:${hash}`, "true", "EX", 60 * 5);

	const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-API-KEY": process.env.NEYNAR_API_KEY as string,
		},
	});

	const data: PostCastResponse = await response.json();

	return data;
}

function extractCreateData(data: number[][]): {
	timestamp: number;
	root: string;
	text: string;
	embeds: string[];
	quote: string;
	channel: string;
	parent: string;
	tokenAddress: string;
} {
	const root = `0x${Buffer.from(data[0]).toString("hex")}`;

	const timestampBuffer = Buffer.from(data[1]);
	let timestamp = 0;
	for (let i = 0; i < timestampBuffer.length; i++) {
		timestamp = timestamp * 256 + timestampBuffer[i];
	}

	const textArrays = data.slice(2, 2 + 16);
	// @ts-ignore
	const textBytes = [].concat(...textArrays);
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(Uint8Array.from(textBytes)).replace(/\0/g, "");

	const embed1Array = data.slice(2 + 16, 2 + 32);
	// @ts-ignore
	const embed1Bytes = [].concat(...embed1Array);
	const embed1Decoder = new TextDecoder("utf-8");
	const embed1 = embed1Decoder
		.decode(Uint8Array.from(embed1Bytes))
		.replace(/\0/g, "");

	const embed2Array = data.slice(2 + 32, 2 + 48);
	// @ts-ignore
	const embed2Bytes = [].concat(...embed2Array);
	const embed2Decoder = new TextDecoder("utf-8");
	const embed2 = embed2Decoder
		.decode(Uint8Array.from(embed2Bytes))
		.replace(/\0/g, "");

	const quoteArray = data[2 + 48];
	const quote = `0x${Buffer.from(quoteArray).toString("hex").slice(-40)}`;

	const channelArray = data[2 + 48 + 1];
	const channelDecoder = new TextDecoder("utf-8");
	const channel = channelDecoder
		.decode(Uint8Array.from(channelArray))
		.replace(/\0/g, "");

	const parentArray = data[2 + 48 + 2];
	const parent = `0x${Buffer.from(parentArray).toString("hex").slice(-40)}`;

	const tokenAddressArray = data[2 + 48 + 3];
	const tokenAddress = `0x${Buffer.from(tokenAddressArray)
		.toString("hex")
		.slice(-40)}`;

	return {
		timestamp,
		root: root as string,
		text,
		embeds: [embed1, embed2].filter((e) => e !== ""),
		quote: quote === zeroHex ? "" : quote,
		channel,
		parent: parent === zeroHex ? "" : parent,
		tokenAddress: tokenAddress as string,
	};
}

function extractDeleteData(data: number[][]): {
	timestamp: number;
	root: string;
	hash: string;
	tokenAddress: string;
} {
	const root = `0x${Buffer.from(data[0]).toString("hex")}`;

	const timestampBuffer = Buffer.from(data[1]);
	let timestamp = 0;
	for (let i = 0; i < timestampBuffer.length; i++) {
		timestamp = timestamp * 256 + timestampBuffer[i];
	}

	const hashArray = data[2];
	const hash = `0x${Buffer.from(hashArray).toString("hex").slice(-40)}`;

	const tokenAddressArray = data[3];
	const tokenAddress = `0x${Buffer.from(tokenAddressArray)
		.toString("hex")
		.slice(-40)}`;

	return {
		timestamp,
		root: root as string,
		hash,
		tokenAddress: tokenAddress as string,
	};
}

async function getCast(identifier: string) {
	const response = await fetch(
		`https://api.neynar.com/v2/farcaster/cast?type=${
			identifier.startsWith("0x") ? "hash" : "url"
		}&identifier=${identifier}`,
		{
			headers: {
				"x-api-key": process.env.NEYNAR_API_KEY as string,
				Accept: "application/json",
			},
		},
	);

	return await response.json();
}

async function validateFrame(message_bytes_in_hex: string) {
	const response = await fetch(
		"https://api.neynar.com/v2/farcaster/frame/validate",
		{
			method: "POST",
			body: JSON.stringify({ message_bytes_in_hex }),
			headers: {
				"x-api-key": process.env.NEYNAR_API_KEY as string,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		},
	);

	return await response.json();
}

async function getPosts(tokenAddress: string) {
	const fid = TOKEN_CONFIG[tokenAddress].fid;
	const response = await fetch(
		`https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=fids&fids=${fid}&with_recasts=false&limit=100`,
		{
			headers: {
				"x-api-key": process.env.NEYNAR_API_KEY as string,
				Accept: "application/json",
			},
		},
	);
	return await response.json();
}

async function deletePost(proof: number[], publicInputs: number[][]) {
	let isValid = false;
	try {
		isValid = await verifyProofForDelete(proof, publicInputs);
	} catch (e) {
		console.error(e);
	}

	if (!isValid) {
		throw new Error("Invalid proof");
	}

	const params = extractDeleteData(publicInputs);

	const signerUuid = await getSignerForAddress(params.tokenAddress);

	const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
		method: "DELETE",
		body: JSON.stringify({
			signer_uuid: signerUuid.signerUuid,
			target_hash: params.hash,
		}),
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-API-KEY": process.env.NEYNAR_API_KEY as string,
		},
	});

	const data: PostCastResponse = await response.json();

	return data;
}
