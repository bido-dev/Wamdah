import Image from 'next/image';

const teamMembers = [
  {
    name: 'Andrey David',
    role: 'CEO',
    image: '/assets/team1.png',
    variant: 'pink',
  },
  {
    name: 'Steven London',
    role: 'CTO',
    image: '/assets/team2.png',
    variant: 'yellow',
  },
  {
    name: 'Ali Josephine',
    role: 'Web Designer',
    image: '/assets/team3.png',
    variant: 'navy',
  },
];

export default function TeamSection() {
  return (
    <section className="landing-team">
      <div className="landing-container team-content">
        <div className="team-cards">
          {teamMembers.map((member) => (
            <div key={member.name} className={`team-card team-card-${member.variant}`}>
              <div className="team-card-shape" aria-hidden="true" />
              <div className="team-card-photo">
                <Image
                  src={member.image}
                  alt={member.name}
                  width={280}
                  height={360}
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

      <footer className="landing-footer">
        <p>جامعة الملك سعود | كلية علوم الحاسب والمعلومات</p>
        <p>جميع الحقوق محفوظة لمشروع ومضة &copy; {new Date().getFullYear()}</p>
      </footer>
    </section>
  );
}
