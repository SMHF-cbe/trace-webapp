import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const mobileWebStyles = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body, #root { width: 100%; height: 100%; min-height: 100%; margin: 0; }
  html { background: #0F1C2E; -webkit-text-size-adjust: 100%; }
  body { min-height: 100vh; min-height: 100dvh; background: #0F1C2E; overflow-x: hidden; overscroll-behavior-y: none; }
  #root { width: 100%; max-width: 480px; height: 100vh; height: 100dvh; margin: 0 auto; overflow-x: hidden; background: #0F1C2E; }
  input, textarea, select { font-size: 16px !important; }
  button, [role="button"] { touch-action: manipulation; }
  @media (min-width: 481px) {
    body { background: #091321; }
    #root { box-shadow: 0 16px 56px rgba(0, 0, 0, 0.28); }
  }
`;

export default function RootDocument({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0F1C2E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="route_sync" />
        <meta name="format-detection" content="telephone=no" />
        <style dangerouslySetInnerHTML={{ __html: mobileWebStyles }} />
      </head>
      <body>
        <ScrollViewStyleReset />
        {children}
      </body>
    </html>
  );
}
