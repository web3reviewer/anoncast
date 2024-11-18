import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const ANON_ADDRESS = "0x0db510e79909666d6dec7f5e49370838c16d950f";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
