import { ANON_ADDRESS } from "./utils";

export type Owner = {
	fungible_id: string;
	owner_address: string;
	quantity: number;
	quantity_string: string;
	first_transferred_date: string;
	last_transferred_date: string;
};

export async function fetchTopOwners(limit = 2000): Promise<Array<Owner>> {
	const owners: Array<Owner> = [];

	let cursor = "";
	while (true) {
		const res: {
			next_cursor: string;
			owners: Array<Owner>;
		} = await fetch(
			`https://api.simplehash.com/api/v0/fungibles/top_wallets?fungible_id=base.${ANON_ADDRESS}&limit=50${
				cursor ? `&cursor=${cursor}` : ""
			}`,
			{
				headers: {
					Accept: "application/json",
					"X-API-KEY": process.env.SIMPLEHASH_API_KEY ?? "",
				},
			},
		).then((res) => res.json());

		owners.push(...res.owners);
		cursor = res.next_cursor;

		if (cursor === "" || owners.length === limit) {
			break;
		}
	}

	return owners;
}
