"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ConnectButton } from "@/components/connect-button";
import { createProof } from "@/lib/proof";
import { useAccount } from "wagmi";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
	return (
		<div className="flex h-screen w-screen flex-col p-4 max-w-screen-sm mx-auto gap-8">
			<div className="flex items-center justify-between">
				<div className="text-3xl font-bold">$ANON</div>
				<ConnectButton />
			</div>
			<CreatePost />
		</div>
	);
}

function CreatePost() {
	const [post, setPost] = useState<string>("");
	const { address } = useAccount();

	const handleCreatePost = async () => {
		if (!address) return;

		const proof = await createProof(address, post);
		if (!proof) {
			return;
		}

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post`, {
			method: "POST",
			body: JSON.stringify({
				proof: Array.from(proof.proof),
				publicInputs: proof.publicInputs.map((i) => Array.from(i)),
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});
	};

	return (
		<div className="flex flex-col gap-4">
			<Textarea
				value={post}
				onChange={(e) => setPost(e.target.value)}
				className="h-32 resize-none"
			/>
			<div className="flex justify-end">
				<Button onClick={handleCreatePost}>Post</Button>
			</div>
		</div>
	);
}
