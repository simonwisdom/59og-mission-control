import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// A page's Markdown as HTML. Raw HTML in the Markdown isn't rendered and unsafe link types
// (like javascript:) are dropped, so a page can't run scripts on the site.
export function PageBody({ markdown }: { markdown: string }) {
  return (
    <div className="page-body">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
