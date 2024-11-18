import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import circuit from "@anon/circuits/target/main.json";

export interface TreeElement {
	address: string;
	balance: string;
	path: string[];
}

export interface Tree {
	elements: TreeElement[];
	root: string;
}

export type ProofInput = {
	address: string;
	balance: string;
	note_root: string;
	index: number;
	note_hash_path: string[];
	timestamp: number;
	text: string[];
	embeds: string[];
	quote: string;
	channel: string;
	parent: string;
};

export interface PostInput {
	text: string;
	embeds: string[];
	quote: string;
	channel: string;
	parent: string;
}

export async function fetchTree(): Promise<Tree> {
	return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merkle-tree`).then(
		(res) => res.json(),
	);
}

export async function createProof(address: string, post: PostInput) {
	// @ts-ignore
	const backend = new BarretenbergBackend(circuit);
	// @ts-ignore
	const noir = new Noir(circuit, backend);

	const tree = await fetchTree();

	const nodeIndex = tree.elements.findIndex(
		(i) => i.address === address.toLowerCase(),
	);
	if (nodeIndex === -1) {
		return null;
	}

	const node = tree.elements[nodeIndex];

	const input: ProofInput = {
		address: address.toLowerCase() as string,
		balance: `0x${BigInt(node.balance).toString(16)}`,
		note_root: tree.root,
		index: nodeIndex,
		note_hash_path: node.path,
		timestamp: Math.floor(Date.now() / 1000),
		text: stringToHexArray(post.text, 16),
		embeds: post.embeds.map((e) => `0x${BigInt(e).toString(16)}`),
		quote: post.quote,
		channel: stringToHexArray(post.channel, 1)[0],
		parent: post.parent,
	};

	// @ts-ignore
	return await noir.generateFinalProof(input);
}

export async function verifyProof(proof: number[], publicInputs: number[][]) {
	// @ts-ignore
	const backend = new BarretenbergBackend(circuit);
	// @ts-ignore
	const noir = new Noir(circuit, backend);

	await backend.instantiate();

	// biome-ignore lint/complexity/useLiteralKeys: <explanation>
	await backend["api"].acirInitProvingKey(
		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		backend["acirComposer"],
		// biome-ignore lint/complexity/useLiteralKeys: <explanation>
		backend["acirUncompressedBytecode"],
	);

	return await noir.verifyFinalProof({
		proof: new Uint8Array(proof),
		publicInputs: publicInputs.map((i) => new Uint8Array(i)),
	});
}

export function stringToHexArray(input: string, length: number): string[] {
	// Convert the string to a UTF-8 byte array
	const encoder = new TextEncoder();
	const byteArray = encoder.encode(input);

	// Convert the byte array to a hexadecimal string
	let hexString = "";
	for (const byte of Array.from(byteArray)) {
		hexString += byte.toString(16).padStart(2, "0");
	}

	const totalLength = 60 * length; // 16 elements of 60 characters
	hexString = hexString.padEnd(totalLength, "0");

	// Split the hexadecimal string into chunks of 60 characters (30 bytes)
	const chunkSize = 60;
	const hexArray: string[] = [];
	for (let i = 0; i < hexString.length; i += chunkSize) {
		hexArray.push(
			`0x${hexString.substring(i, Math.min(i + chunkSize, hexString.length))}`,
		);
	}

	return hexArray;
}
