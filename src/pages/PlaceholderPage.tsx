type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="muted">This section is intentionally small while the technical foundation is being built.</p>
    </section>
  );
}
