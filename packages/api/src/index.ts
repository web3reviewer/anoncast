import { Elysia, t } from "elysia";
import Redis from "ioredis";
import { buildMimc7 as buildMimc } from "circomlibjs";
import { MerkleTreeMiMC, MiMC7 } from "../lib/merkle-tree";
import { fetchTopOwners, Owner } from "../lib/simplehash";
import { verifyProof } from "../lib/proof";
import cors from "@elysiajs/cors";
import { Logestic } from "logestic";

const redis = new Redis(process.env.REDIS_URL as string);

const app = new Elysia()
	.use(cors().use(Logestic.preset("common")))
	.get("/merkle-tree", fetchTree)
	.post("/post", ({ body }) => submitPost(body.proof, body.publicInputs), {
		body: t.Object({
			proof: t.Array(t.Number()),
			publicInputs: t.Array(t.Array(t.Number())),
		}),
	});

app.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

async function fetchTree() {
	const data = await redis.get("anon:tree");
	if (data) {
		return JSON.parse(data);
	}

	const mimc = await buildMimc();
	const merkleTree = new MerkleTreeMiMC(11, mimc);

	const owners = await fetchOwners();
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
			path: merkleTree
				.proof(index)
				.pathElements.map((p) => `0x${p}` as `0x${string}`),
			address: owner.owner_address.toLowerCase(),
			balance: owner.quantity_string,
		};
	});

	const tree = {
		root,
		elements,
	};

	await redis.set("anon:tree", JSON.stringify(tree), "EX", 60 * 5);

	return tree;
}

async function fetchOwners(): Promise<Array<Owner>> {
	const data = await redis.get("anon:owners");
	if (data) {
		return JSON.parse(data);
	}

	const owners = await fetchTopOwners();
	await redis.set("anon:owners", JSON.stringify(owners), "EX", 60 * 5);

	return owners;
}

async function submitPost(proof: number[], publicInputs: number[][]) {
	let isValid = false;
	try {
		isValid = await verifyProof(proof, publicInputs);
	} catch (e) {
		console.error(e);
	}

	if (!isValid) {
		throw new Error("Invalid proof");
	}

	return extractData(publicInputs);
}

function extractData(data: number[][]): {
	timestamp: number;
	root: `0x${string}`;
	text: string;
} {
	const timestampBuffer = Buffer.from(data[0]);
	let timestamp = 0;
	for (let i = 0; i < timestampBuffer.length; i++) {
		timestamp = timestamp * 256 + timestampBuffer[i];
	}

	const root = `0x${Buffer.from(data[1]).toString("hex")}`;

	const messageArrays = data.slice(2, 2 + 16);
	// @ts-ignore
	const messageBytes = [].concat(...messageArrays);
	const decoder = new TextDecoder("utf-8");
	const message = decoder
		.decode(Uint8Array.from(messageBytes))
		.replace(/\0/g, "");

	return {
		timestamp,
		root: root as `0x${string}`,
		text: message,
	};
}
