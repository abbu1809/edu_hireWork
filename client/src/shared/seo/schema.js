import { SITE_NAME, SITE_URL } from "./useSeo";

// schema.org JSON-LD builders. Only real record fields are used; missing
// values are omitted rather than invented.

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
  );

const ORG = { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: `${SITE_URL}/` };

export const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) =>
    clean({ "@type": "ListItem", position: index + 1, name: item.name, item: item.path ? `${SITE_URL}${item.path}` : undefined })
  ),
});

export const faqSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: "en-IN",
  publisher: ORG,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/careers?search={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

const EMPLOYMENT_TYPES = { "Full-Time": "FULL_TIME", "Part-Time": "PART_TIME", Contract: "CONTRACTOR" };

/** Google for Jobs / answer-engine friendly vacancy markup. */
export const jobPostingSchema = (v) =>
  clean({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: v.description || `${v.title} — ${v.subject} faculty vacancy at ${v.institute_name}, ${v.city}. Salary: ${v.salary_range}.`,
    datePosted: v.created_at,
    employmentType: EMPLOYMENT_TYPES[v.type] || "FULL_TIME",
    hiringOrganization: clean({ "@type": "Organization", name: v.institute_name }),
    jobLocation: {
      "@type": "Place",
      address: clean({ "@type": "PostalAddress", addressLocality: v.city, streetAddress: v.location, addressCountry: "IN" }),
    },
    occupationalCategory: v.subject ? `${v.subject} Teacher` : undefined,
    experienceRequirements: v.min_experience,
    url: `${SITE_URL}/careers/${v.id}`,
    directApply: true,
    identifier: { "@type": "PropertyValue", name: SITE_NAME, value: v.id },
  });

export const articleSchema = (post) =>
  clean({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    image: post.og_image_url || post.cover_image_url,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: { "@type": post.author_name ? "Person" : "Organization", name: post.author_name || SITE_NAME },
    publisher: ORG,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: Array.isArray(post.tags) ? post.tags.join(", ") : undefined,
    articleSection: post.category,
    wordCount: post.content ? String(post.content).split(/\s+/).length : undefined,
  });

export const teacherProfileSchema = (t) => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: `${SITE_URL}/faculty/${t.id}`,
  mainEntity: clean({
    "@type": "Person",
    name: t.name,
    jobTitle: t.headline || (t.primary_subject ? `${t.primary_subject} Faculty` : undefined),
    description: t.bio,
    image: t.profile_photo_url,
    knowsAbout: [t.primary_subject, ...(t.subjects || [])].filter((v, i, a) => v && a.indexOf(v) === i),
    address: t.city ? { "@type": "PostalAddress", addressLocality: t.city, addressCountry: "IN" } : undefined,
    worksFor: t.current_organization ? { "@type": "Organization", name: t.current_organization } : undefined,
  }),
});

export const itemListSchema = (name, items) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.slice(0, 50).map((item, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_URL}${item.path}`, name: item.name })),
});
