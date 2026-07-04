import Image from 'next/image';

const teamMembers = [
  {
    name: 'Bilal Zakkar',
    role: 'CEO',
    image: '/assets/team1.png',
    variant: 'purple',
  },
  {
    name: 'Abdalla Ammar',
    role: 'CTO',
    image: '/assets/team2.png',
    variant: 'sky',
  },
  {
    name: 'Sulaiman Mokhaniq',
    role: 'Web Designer',
    image: '/assets/team3.png',
    variant: 'teal',
  },
];

export default function TeamSection() {
  return (
    <section className="landing-team">
      <div className="landing-container team-content">
        <div className="team-cards">
          {teamMembers.map((member) => (
            <div key={member.name} className={`team-card team-card-${member.variant}`}>
              <div className="team-card-photo">
                <Image
                  src={member.image}
                  alt={member.name}
                  width={200}
                  height={200}
                  className="team-photo-img"
                />
              </div>
              <div className="team-card-info">
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
