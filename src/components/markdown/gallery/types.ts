export type Gallery = {
	id?: string;
	title: string;
	cover: string;
	caption?: string;
	images?: { src: string; caption?: string }[];
};
