import Image from 'next/image';

const teamMembers = [
  {
    name: 'Bilal Zakkar',
    role: 'CEO',
    image: '/assets/team1.png',
    variant: 'sky',
    linkedin: 'https://www.linkedin.com/in/bilal-zakkar-swe/',
  },
  {
    name: 'Abdalla Ammar',
    role: 'CTO',
    image: '/assets/team2.png',
    variant: 'blue',
    linkedin: 'https://www.linkedin.com/in/abdalla-ammar-418351238/',
  },
  {
    name: 'Sulaiman Mokhaniq',
    role: 'Web Designer',
    image: '/assets/team3.png',
    variant: 'navy',
    linkedin: 'https://www.linkedin.com/in/sulaiman-mokhaniq/',
  },
];

export default function TeamSection() {
  return (
    <section className="landing-team">
      <div className="landing-container team-content">

        <h2 className="team-section-title">أعضاء الفريق</h2>

        {/* المشرف */}
        <div className="team-cards supervisor-row">
          <a
            href="https://www.linkedin.com/in/sultan-alsarra-56977a63/"
            target="_blank"
            rel="noopener noreferrer"
            className="team-card team-card-supervisor"
            aria-label="LinkedIn profile of DR. Sultan Alsarra"
          >
            <div className="team-card-photo">
              <div className="team-card-shape" aria-hidden="true" />
              <Image
                src="/assets/team-supervisor.png"
                alt="DR. Sultan Alsarra"
                width={280}
                height={360}
                className="team-photo-img"
                priority
              />
            </div>
            <div className="team-card-info">
              <h3 className="team-name">DR. Sultan Alsarra</h3>
            </div>
          </a>
        </div>

        {/* أعضاء الفريق */}
        <div className="team-cards">
          {teamMembers.map((member) => (
            <a
              key={member.name}
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className={`team-card team-card-${member.variant}`}
              aria-label={`LinkedIn profile of ${member.name}`}
            >
              <div className="team-card-photo">
                <div className="team-card-shape" aria-hidden="true" />
                <Image
                  src={member.image}
                  alt={member.name}
                  width={280}
                  height={360}
                  className="team-photo-img"
                  priority
                />
              </div>
              <div className="team-card-info">
                <h3 className="team-name">{member.name}</h3>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
