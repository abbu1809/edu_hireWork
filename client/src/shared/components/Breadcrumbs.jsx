import { Fragment } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

/**
 * Visible breadcrumb trail. Pair with breadcrumbSchema(items) in useSeo so the
 * same trail is exposed as structured data. Items: [{ name, path? }] — the
 * last item is the current page.
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.name}-${index}`}>
              <li>
                {last || !item.path ? (
                  <span aria-current={last ? "page" : undefined}>{item.name}</span>
                ) : (
                  <Link to={item.path}>{item.name}</Link>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" style={{ display: "inline-flex" }}>
                  <ChevronRight size={14} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
