import { verifyProof } from "@/lib/proof";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const body: {
		proof: number[];
		publicInputs: number[][];
	} = await request.json();

	let isValid = false;
	try {
		isValid = await verifyProof(body.proof, body.publicInputs);
	} catch (e) {
		console.error(e);
	}

	if (!isValid) {
		return NextResponse.json({
			success: false,
		});
	}

	return NextResponse.json({
		success: true,
	});
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
