import fetch from 'isomorphic-unfetch';
import {EIP1193Request} from 'eip-1193';

let counter = 0;
export async function ethereum_request<U extends any, T>(
	endpoint: string,
	req: {method: string; params?: U}
): Promise<T> {
	const {method, params} = req;
	// NOTE: special case to allow batch request via EIP-1193
	if (method === 'eth_batch') {
		if (params && (params as any[]).length === 0) {
			return [] as unknown as T;
		}
		const requests = [];
		for (const param of params as {method: string; params?: any[]}[]) {
			requests.push({
				id: ++counter,
				jsonrpc: '2.0',
				method: param.method,
				params: param.params,
			});
		}
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(requests),
		});

		const jsonArray = (await response.json()) as {result?: T; error?: any}[];
		for (const response of jsonArray) {
			if (response.error || !response.result) {
				throw response.error || {code: 5000, message: 'No Result'};
			}
		}
		return jsonArray.map((v) => v.result) as unknown as T;
	}
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({
				id: ++counter,
				jsonrpc: '2.0',
				method,
				params,
			}),
		});
		const json: {result?: T; error?: any} = await response.json();
		if (json.error || !json.result) {
			throw json.error || {code: 5000, message: 'No Result'};
		}
		return json.result;
	} catch (err) {
		// console.log(`FETCH error`, err);
		throw err;
	}
}

export class JSONRPCHTTPProvider {
	supportsETHBatch = true;
	constructor(protected endpoint: string) {}

	request<T, Request extends EIP1193Request = EIP1193Request>(args: Request): Promise<T> {
		return ethereum_request<any, T>(this.endpoint, args);
	}
}
