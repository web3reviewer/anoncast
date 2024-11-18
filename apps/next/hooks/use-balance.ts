import { ANON_ADDRESS } from "@/lib/utils";
import { erc20Abi } from "viem";
import { useAccount, useReadContract } from "wagmi";

export function useBalance() {
	const { address } = useAccount();
	return useReadContract({
		address: ANON_ADDRESS,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
	});
}
