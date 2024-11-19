import { GetCastResponse, PostCastResponse } from "@/lib/types";
import { createProof } from "@anon/api/lib/proof";
import { createContext, useContext, useState, ReactNode } from "react";

type State =
	| {
			status: "idle" | "generating" | "posting";
	  }
	| {
			status: "success";
			post: PostCastResponse;
	  }
	| {
			status: "error";
			error: string;
	  };

interface CreatePostContextProps {
	text: string | null;
	setText: (text: string) => void;
	image: string | null;
	setImage: (image: string | null) => void;
	embed: string | null;
	setEmbed: (embed: string | null) => void;
	quote: GetCastResponse | null;
	setQuote: (quote: GetCastResponse | null) => void;
	channel: string | null;
	setChannel: (channel: string | null) => void;
	parent: GetCastResponse | null;
	setParent: (parent: GetCastResponse | null) => void;
	createPost: () => Promise<void>;
	embedCount: number;
	state: State;
}

const CreatePostContext = createContext<CreatePostContextProps | undefined>(
	undefined,
);

export const CreatePostProvider = ({
	tokenAddress,
	userAddress,
	onSuccess,
	children,
}: {
	tokenAddress: string;
	userAddress: string;
	onSuccess?: () => void;
	children: ReactNode;
}) => {
	const [text, setText] = useState<string | null>(null);
	const [image, setImage] = useState<string | null>(null);
	const [embed, setEmbed] = useState<string | null>(null);
	const [quote, setQuote] = useState<GetCastResponse | null>(null);
	const [channel, setChannel] = useState<string | null>(null);
	const [parent, setParent] = useState<GetCastResponse | null>(null);
	const [state, setState] = useState<State>({ status: "idle" });

	const createPost = async () => {
		if (!userAddress) return;

		setState({ status: "generating" });
		try {
			const embeds = [image, embed].filter((e) => e !== null) as string[];
			const proof = await createProof({
				address: userAddress,
				text,
				embeds,
				quote: quote?.cast?.hash ?? null,
				channel,
				parent: parent?.cast?.hash ?? null,
				tokenAddress,
			});
			if (!proof) {
				setState({ status: "error", error: "Not allowed to post" });
				return;
			}

			setState({ status: "posting" });

			let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post`, {
				method: "POST",
				body: JSON.stringify({
					proof: Array.from(proof.proof),
					publicInputs: proof.publicInputs.map((i) => Array.from(i)),
				}),
				headers: {
					"Content-Type": "application/json",
				},
			});

			// Try aggain
			if (!response.ok) {
				response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post`, {
					method: "POST",
					body: JSON.stringify({
						proof: Array.from(proof.proof),
						publicInputs: proof.publicInputs.map((i) => Array.from(i)),
					}),
					headers: {
						"Content-Type": "application/json",
					},
				});
			}

			if (!response.ok) {
				setState({ status: "error", error: "Failed to post" });
				return;
			}

			// Try again if it failed
			let data: PostCastResponse | undefined = await response.json();
			if (!data?.success) {
				response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post`, {
					method: "POST",
					body: JSON.stringify({
						proof: Array.from(proof.proof),
						publicInputs: proof.publicInputs.map((i) => Array.from(i)),
					}),
					headers: {
						"Content-Type": "application/json",
					},
				});
				data = await response.json();
			}

			if (data?.success) {
				setState({ status: "success", post: data });
				onSuccess?.();
			} else {
				setState({ status: "error", error: "Failed to post" });
			}
		} catch (e) {
			setState({ status: "error", error: "Failed to post" });
			console.error(e);
		}
	};

	const embedCount = [image, embed, quote].filter((e) => e !== null).length;

	return (
		<CreatePostContext.Provider
			value={{
				text,
				setText,
				image,
				setImage,
				embed,
				setEmbed,
				quote,
				setQuote,
				channel,
				setChannel,
				parent,
				setParent,
				embedCount,
				createPost,
				state,
			}}
		>
			{children}
		</CreatePostContext.Provider>
	);
};

export const useCreatePost = () => {
	const context = useContext(CreatePostContext);
	if (context === undefined) {
		throw new Error("useCreatePost must be used within a CreatePostProvider");
	}
	return context;
};
