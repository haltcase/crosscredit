import { z } from "zod";

export const titleRefSchema = z.object({
	id: z.number().int().positive(),
	type: z.enum(["movie", "tv"])
});
export type TitleRef = z.infer<typeof titleRefSchema>;
export type Title = TitleRef & {
	name: string;
	year: string;
	poster: string | null;
	overview: string;
};
export interface Role {
	label: string;
	episodes: number | null;
}
export interface Person {
	id: number;
	name: string;
	photo: string | null;
	order: number;
	cast: Role[];
	crew: Role[];
}
export interface SharedPerson {
	person: Person;
	left: Person;
	right: Person;
}
export type Filter = "cast" | "crew" | "all";

const baseCreditSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	profile_path: z.string().nullable().default(null),
	order: z.number().default(9999)
});
const roleSchema = z.object({ character: z.string(), episode_count: z.number() });
const jobSchema = z.object({ job: z.string(), episode_count: z.number() });
export const creditsSchema = z.object({
	cast: z.array(
		baseCreditSchema.extend({
			character: z.string().optional(),
			roles: z.array(roleSchema).optional()
		})
	),
	crew: z.array(
		baseCreditSchema.extend({
			job: z.string().optional(),
			jobs: z.array(jobSchema).optional()
		})
	)
});

function mergeRoles(existing: Role[], incoming: Role[]) {
	for (const role of incoming) {
		const previous = existing.find((item) => item.label === role.label);
		if (!previous) existing.push(role);
		else if (role.episodes !== null) {
			previous.episodes = Math.max(previous.episodes ?? 0, role.episodes);
		}
	}
}

export function normalizeCredits(data: z.infer<typeof creditsSchema>): Person[] {
	const people = new Map<number, Person>();
	for (const kind of ["cast", "crew"] as const) {
		for (const credit of data[kind]) {
			let person = people.get(credit.id);
			if (!person) {
				person = {
					id: credit.id,
					name: credit.name,
					photo: credit.profile_path,
					order: credit.order,
					cast: [],
					crew: []
				};
				people.set(credit.id, person);
			}
			person.order = Math.min(person.order, credit.order);
			person.photo ??= credit.profile_path;
			if (kind === "cast" && "roles" in credit && credit.roles) {
				mergeRoles(
					person.cast,
					credit.roles.map((role) => ({
						label: role.character || "Cast",
						episodes: role.episode_count
					}))
				);
			} else if (kind === "cast") {
				mergeRoles(person.cast, [
					{ label: ("character" in credit && credit.character) || "Cast", episodes: null }
				]);
			} else if ("jobs" in credit && credit.jobs) {
				mergeRoles(
					person.crew,
					credit.jobs.map((job) => ({ label: job.job || "Crew", episodes: job.episode_count }))
				);
			} else {
				mergeRoles(person.crew, [
					{ label: ("job" in credit && credit.job) || "Crew", episodes: null }
				]);
			}
		}
	}
	return [...people.values()];
}

export function intersectCredits(left: Person[], right: Person[], filter: Filter): SharedPerson[] {
	const rightById = new Map(right.map((person) => [person.id, person]));
	return left
		.flatMap((person) => {
			const other = rightById.get(person.id);
			if (
				!other ||
				(filter !== "all" && (person[filter].length === 0 || other[filter].length === 0))
			) {
				return [];
			}
			return [{ person, left: person, right: other }];
		})
		.toSorted((first, second) => {
			const aCast = first.left.cast.length > 0 && first.right.cast.length > 0;
			const bCast = second.left.cast.length > 0 && second.right.cast.length > 0;
			return (
				Number(bCast) - Number(aCast) ||
				first.left.order + first.right.order - (second.left.order + second.right.order) ||
				first.person.name.localeCompare(second.person.name)
			);
		});
}

export function titleKey(ref: TitleRef): string {
	return `${ref.type}-${ref.id}`;
}
export function parseTitleKey(value: unknown): TitleRef | null {
	if (typeof value !== "string") return null;
	const match = /^(?<type>movie|tv)-(?<id>[1-9]\d{0,9})$/.exec(value);
	if (!match) return null;
	const result = titleRefSchema.safeParse({
		type: match.groups?.type,
		id: Number(match.groups?.id)
	});
	return result.success ? result.data : null;
}
