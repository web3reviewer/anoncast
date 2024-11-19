"use client";

import { ConnectButton } from "@/components/connect-button";
import { CreatePost } from "@/components/create-post";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ANON_ADDRESS } from "@anon/api/lib/config";
import { CircleHelp } from "lucide-react";
import { useAccount } from "wagmi";

export default function Home() {
	const { address } = useAccount();

	return (
		<div className="flex h-screen w-screen flex-col p-4 max-w-screen-sm mx-auto gap-8">
			<div className="flex items-center justify-between">
				<div className="text-3xl font-bold">$ANON</div>
				<ConnectButton />
			</div>
			<Alert>
				<CircleHelp className="h-4 w-4" />
				<AlertTitle className="font-bold">
					Post anonymously to Farcaster
				</AlertTitle>
				<AlertDescription>
					Must have <b>20,000 $ANON</b> in your wallet to post. Posts are made
					anonymous using zk proofs. Due to the complex calculations required,
					it could take up to a few minutes to post. We&apos;ll work on speeding
					this up in the future.
				</AlertDescription>
			</Alert>
			{address && (
				<CreatePost tokenAddress={ANON_ADDRESS} userAddress={address} />
			)}
		</div>
	);
}
