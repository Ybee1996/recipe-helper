import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

// Password managers and Chrome autofill stamp nodes/attrs before hydration.
const STRIP_EXTENSION_DOM = `(function(){
  var attrRe=/gchrome_uniqueid|gcruniqueid|keeper-lock|cz-shortcut-listen/i;
  var tagRe=/^(keeper-lock)$/i;
  function stripEl(el){
    if(!el||el.nodeType!==1)return;
    if(tagRe.test(el.tagName)){el.remove();return;}
    if(!el.getAttributeNames)return;
    var names=el.getAttributeNames();
    for(var i=0;i<names.length;i++){
      if(attrRe.test(names[i]))el.removeAttribute(names[i]);
    }
  }
  function stripTree(root){
    if(!root||root.nodeType!==1)return;
    stripEl(root);
    if(!root.querySelectorAll)return;
    var extra=root.querySelectorAll('keeper-lock,[data-keeper-lock-id]');
    for(var i=0;i<extra.length;i++){
      if(tagRe.test(extra[i].tagName))extra[i].remove();
      else stripEl(extra[i]);
    }
    var nodes=root.querySelectorAll('input,textarea,select,button,form,label');
    for(var j=0;j<nodes.length;j++)stripEl(nodes[j]);
  }
  stripTree(document.documentElement);
  var obs=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==='attributes'&&attrRe.test(m.attributeName||'')){
        m.target.removeAttribute(m.attributeName);
      }
      if(m.type==='childList'){
        for(var j=0;j<m.addedNodes.length;j++)stripTree(m.addedNodes[j]);
      }
    }
  });
  obs.observe(document.documentElement,{attributes:true,subtree:true,childList:true});
  function stop(){try{obs.disconnect()}catch(e){}}
  addEventListener('DOMContentLoaded',function(){setTimeout(stop,2500)});
})();`;

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Recipe Box",
  description: "Personal recipe search and cooking assistant",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Recipe Box",
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f4efe6",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} font-[family-name:var(--font-sans)] antialiased`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        <Script id="strip-extension-dom" strategy="beforeInteractive">
          {STRIP_EXTENSION_DOM}
        </Script>
        <NavigationProgress>{children}</NavigationProgress>
      </body>
    </html>
  );
}
