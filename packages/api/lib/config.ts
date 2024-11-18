export const ANON_ADDRESS = "0x0db510e79909666d6dec7f5e49370838c16d950f";
export const COMMENT_ADDRESS = "0x0000000000000000000000000000000000000000";

export const TOKEN_CONFIG: Record<
	string,
	{
		ticker: string;
		minAmount: string;
		farcasterUsername: string;
	}
> = {
	[ANON_ADDRESS]: {
		ticker: "ANON",
		minAmount: "20000000000000000000000",
		farcasterUsername: "anoncast",
	},
	[COMMENT_ADDRESS]: {
		ticker: "COMMENT",
		minAmount: "1",
		farcasterUsername: "comment",
	},
};

export const USERNAME_TO_ADDRESS: Record<string, string> = {
	anoncast: ANON_ADDRESS,
	comment: COMMENT_ADDRESS,
};
