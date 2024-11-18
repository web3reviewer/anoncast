import { GetCastResponse } from "@/app/api/get-cast/route";
import { createProof } from "@anon/api/lib/proof";
import { createContext, useContext, useState, ReactNode } from "react";
import { useAccount } from "wagmi";

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
}

const CreatePostContext = createContext<CreatePostContextProps | undefined>(
	undefined,
);

export const CreatePostProvider = ({ children }: { children: ReactNode }) => {
	const { address } = useAccount();
	const [text, setText] = useState<string | null>(null);
	const [image, setImage] = useState<string | null>(null);
	const [embed, setEmbed] = useState<string | null>(null);
	const [quote, setQuote] = useState<GetCastResponse | null>(null);
	const [channel, setChannel] = useState<string | null>(null);
	const [parent, setParent] = useState<GetCastResponse | null>(null);

	const createPost = async () => {
		if (!address) return;

		const embeds = [image, embed].filter((e) => e !== null) as string[];

		const proof = await createProof(address, {
			text: text ?? "",
			embeds,
			quote: quote?.cast?.hash ?? "",
			channel: channel ?? "",
			parent: parent?.cast?.hash ?? "",
		});
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
