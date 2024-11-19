"use client";

import { USERNAME_TO_ADDRESS } from "@anon/api/lib/config";
import { NeynarAuthButton, NeynarContextProvider, Theme } from "@neynar/react";
import { INeynarAuthenticatedUser } from "@neynar/react/dist/types/common";

export default function SignIn() {
	const handleSuccess = async ({
		user,
	}: { user: INeynarAuthenticatedUser }) => {
		if (!USERNAME_TO_ADDRESS[user.username]) {
			console.error("No address found for username", user.username);
			return;
		}

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-signer`, {
			method: "POST",
			body: JSON.stringify({
				address: USERNAME_TO_ADDRESS[user.username],
				signerUuid: user.signer_uuid,
			}),
			headers: {
				"Content-Type": "application/json",
			},
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
