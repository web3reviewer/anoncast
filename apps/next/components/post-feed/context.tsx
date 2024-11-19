import { PostCastResponse } from "@/lib/types";
import { generateProofForDelete } from "@anon/api/lib/proof";
import { createContext, useContext, useState, ReactNode } from "react";

type State =
	| {
			status: "idle" | "generating" | "deleting";
	  }
	| {
			status: "success";
			post: PostCastResponse;
	  }
	| {
			status: "error";
			error: string;
	  };

interface DeletePostContextProps {
	deletePost: (hash: string) => Promise<void>;
	state: State;
}

const DeletePostContext = createContext<DeletePostContextProps | undefined>(
	undefined,
);

export const DeletePostProvider = ({
	tokenAddress,
	userAddress,
	children,
}: {
	tokenAddress: string;
	userAddress?: string;
	children: ReactNode;
}) => {
	const [state, setState] = useState<State>({ status: "idle" });

	const deletePost = async (hash: string) => {
		if (!userAddress) return;

		setState({ status: "generating" });
		try {
			const proof = await generateProofForDelete({
				address: userAddress,
				hash,
				tokenAddress,
			});
			if (!proof) {
				setState({ status: "error", error: "Not allowed to delete" });
				return;
			}

			setState({ status: "deleting" });

			let response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/post/delete`,
				{
					method: "POST",
					body: JSON.stringify({
						proof: Array.from(proof.proof),
						publicInputs: proof.publicInputs.map((i) => Array.from(i)),
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			// Try aggain
			if (!response.ok) {
				response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/post/delete`,
					{
						method: "POST",
						body: JSON.stringify({
							proof: Array.from(proof.proof),
							publicInputs: proof.publicInputs.map((i) => Array.from(i)),
						}),
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
			}

			if (!response.ok) {
				setState({ status: "error", error: "Failed to delete" });
				return;
			}

			// Try again if it failed
			let data: PostCastResponse | undefined = await response.json();
			if (!data?.success) {
				response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/post/delete`,
					{
						method: "POST",
						body: JSON.stringify({
							proof: Array.from(proof.proof),
							publicInputs: proof.publicInputs.map((i) => Array.from(i)),
						}),
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
				data = await response.json();
			}

			if (data?.success) {
				setState({ status: "success", post: data });
			} else {
				setState({ status: "error", error: "Failed to delete" });
			}
		} catch (e) {
			setState({ status: "error", error: "Failed to delete" });
			console.error(e);
		}
	};

	return (
		<DeletePostContext.Provider
			value={{
				deletePost,
				state,
			}}
		>
			{children}
		</DeletePostContext.Provider>
	);
};

export const useDeletePost = () => {
	const context = useContext(DeletePostContext);
	if (context === undefined) {
		throw new Error("useDeletePost must be used within a DeletePostProvider");
	}
	return context;
};
