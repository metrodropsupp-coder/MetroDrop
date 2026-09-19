"use strict";

window.metroDropSupabase = (() => {
	const projectUrl = "https://ioiqdllargpfaolusyuo.supabase.co";
	const publishableKey = "sb_publishable_v8BCQQNEkgXUYcPwcGSj6A_Ifzg-dkv";
	const apiUrl = `${projectUrl}/rest/v1`;
	const headers = {
		apikey: publishableKey,
		Authorization: `Bearer ${publishableKey}`,
		"Content-Type": "application/json"
	};

	const request = async (path, options = {}) => {
		const response = await fetch(`${apiUrl}/${path}`, {
			...options,
			headers: { ...headers, ...(options.headers || {}) }
		});
		if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
		return response.status === 204 ? null : response.json();
	};

	return {
		load: async () => {
			const [sections, cases] = await Promise.all([
				request("case_sections?select=*&order=created_at.asc"),
				request("cases?select=*&order=created_at.asc")
			]);
			return { sections, cases };
		},
		createSection: (section) => request("case_sections", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(section) }),
		createCase: (item) => request("cases", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(item) }),
		updateCase: (id, item) => request(`cases?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(item) }),
		deleteSection: (id) => request(`case_sections?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }),
		deleteCasesBySection: (id) => request(`cases?section_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }),
		deleteCase: (id) => request(`cases?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" })
	};
})();