import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { buildMimc7 as buildMimc } from "circomlibjs";
import { MerkleTreeMiMC, MiMC7 } from "@/lib/merkle-tree";
import { fetchTopOwners, Owner } from "@/lib/simplehash";

const redis = new Redis(process.env.REDIS_URL as string);

export async function GET(request: NextRequest) {
	const tree = await fetchTree();

	return NextResponse.json(tree);
}

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
