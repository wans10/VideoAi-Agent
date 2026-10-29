export function HomeHeroSecondaryLinks({
  compareLabel,
  trustBadges,
}: {
  compareLabel: string;
  trustBadges: string[];
}) {
  return (
    <div className="home-hero-reassurance">
      <div className="home-hero-guarantees">{trustBadges.slice(0, 3).map(badge => <span key={badge}>{badge}</span>)}</div>
    </div>
  );
}
