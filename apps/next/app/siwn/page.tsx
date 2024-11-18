"use client";

import { ANON_ADDRESS } from "@/lib/utils";
import { NeynarAuthButton, NeynarContextProvider, Theme } from "@neynar/react";
import { INeynarAuthenticatedUser } from "@neynar/react/dist/types/common";

const usernameToAddress: Record<string, string> = {
	anoncast: ANON_ADDRESS,
	comment: "0x0000000000000000000000000000000000000000",
};

export default function SignIn() {
	const handleSuccess = async ({
		user,
	}: { user: INeynarAuthenticatedUser }) => {
		if (!usernameToAddress[user.username]) {
			return;
		}

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-signer`, {
			method: "POST",
			body: JSON.stringify({
				address: usernameToAddress[user.username],
				signerUuid: user.signer_uuid,
			}),
		});
	};

	return (
		<NeynarContextProvider
			settings={{
				clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
				defaultTheme: Theme.Dark,
				eventsCallbacks: {
					onAuthSuccess: handleSuccess,
				},
			}}
		>
			<main className="flex min-h-screen flex-col items-center justify-between p-24">
				<div className="z-10 w-64 p-2 flex items-center justify-center bg-white/10 rounded-lg">
					<NeynarAuthButton />
				</div>
			</main>
		</NeynarContextProvider>
	);
}
