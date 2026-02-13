export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname === '/.well-known/apple-app-site-association') {
    return new Response(
      JSON.stringify({
        applinks: {
          apps: [],
          details: [
            {
              appID: 'J39B2498YF.com.tabbitrabbit.app',
              paths: ['/bill/*'],
            },
          ],
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  matcher: '/.well-known/apple-app-site-association',
};
