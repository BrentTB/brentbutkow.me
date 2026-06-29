// Vercel serverless function (Node runtime). Vercel adds the visitor's country to the
// `x-vercel-ip-country` header on every function request, so geo-detection needs no edge runtime
// or third-party IP lookup. Returns { country: 'us' | 'uk' | 'za' | null }.
const COUNTRY_MAP = {
  US: 'us',
  GB: 'uk',
  ZA: 'za',
} as const
type SupportedCountry = (typeof COUNTRY_MAP)[keyof typeof COUNTRY_MAP]

export default function handler(request: Request): Response {
  const code = request.headers.get('x-vercel-ip-country')?.toUpperCase()
  const country: SupportedCountry | null =
    code && code in COUNTRY_MAP ? COUNTRY_MAP[code as keyof typeof COUNTRY_MAP] : null
  return Response.json({ country })
}
