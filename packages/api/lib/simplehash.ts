export type Owner = {
	fungible_id: string;
	owner_address: string;
	quantity: number;
	quantity_string: string;
	first_transferred_date: string;
	last_transferred_date: string;
};

const AMOUNT = "20000000000000000000000";

export async function fetchTopOwners(
	tokenAddress: string,
	minimumBalance = AMOUNT,
): Promise<Array<Owner>> {
	const owners: Array<Owner> = [];

	let cursor = "";
	while (true) {
		const res: {
			next_cursor: string;
			owners: Array<Owner>;
		} = await fetch(
			`https://api.simplehash.com/api/v0/fungibles/top_wallets?fungible_id=base.${tokenAddress}&limit=50${
				cursor ? `&cursor=${cursor}` : ""
			}`,
			{
				headers: {
					Accept: "application/json",
					"X-API-KEY": process.env.SIMPLEHASH_API_KEY ?? "",
				},
			},
		).then((res) => res.json());

		let shouldBreak = false;
		for (const owner of res.owners) {
			if (BigInt(owner.quantity_string) >= BigInt(minimumBalance)) {
				owners.push(owner);
			} else {
				shouldBreak = true;
				break;
			}
		}

		cursor = res.next_cursor;
		if (cursor === "" || shouldBreak) {
			break;
		}
	}

	return owners;
}
