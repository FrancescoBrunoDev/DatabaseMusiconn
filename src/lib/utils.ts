import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatData({ date, lang }: { date: string; lang: string }) {
	const formattedData = new Date(date).toLocaleString(lang, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	return formattedData;
}

export function formatMD({ markdown }: { markdown: string }) {
	const metadata: RegExpMatchArray | null = markdown.match(/---\n([\s\S]*?)\n---/);
	const metadataArray = metadata ? metadata[1].split('\n') : [];
	const metadataObject = metadataArray.reduce((acc: Record<string, string>, curr: string) => {
		const [key, ...values] = curr.split(':');
		if (key) {
			acc[key.trim()] = values.join(':').trim();
		}
		return acc;
	}, {});

	const content = metadata ? markdown.replace(metadata[0], '') : markdown;

	return {
		content,
		metadata: metadataObject
	};
}
