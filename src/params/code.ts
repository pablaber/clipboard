import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => /^\d{8}$/.test(param);
