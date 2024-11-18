"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { Textarea } from "@/components/ui/textarea";
import { createProof } from "@anon/api/lib/proof";
import { CreatePost } from "@/components/create-post";

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
