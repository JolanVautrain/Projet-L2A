import { useState } from "react";
import "../css/index.css";
import "../css/Contacts.css";
import jolanImg from "../assets/contacts/Jolan.png";

const devs = [
  {
    name: "Jolan Vautrain",
    role: "Chef mise en place du projet",
    email: "jolan.vautrain@etudiant.univ-rennes.fr",
    img: jolanImg,
    egg: "Maîtrise secrète de la mise en place du projet (docker).",
  },
  {
    name: "Gabriel Salaun",
    role: "Camarade efficace dans le travail",
    email: "gabriel.salaun@etudiant.univ-rennes.fr",
    img: "https://avatars.githubusercontent.com/u/00000002?v=4",
    egg: "Détient un record personnel : 42 pull-requests en une journée.",
  },
  {
    name: "Ethan Louis",
    role: "Le travailleur mécontent",
    email: "ethan.louis@etudiant.univ-rennes.fr",
    img: "https://i.pravatar.cc/150?img=8",
    egg: "Râle mais délivre ; spécialiste des fixes 23:00.",
  },
  {
    name: "Lalo Lucas",
    role: "Heureux dans la vie",
    email: "lalo.lucas@etudiant.univ-rennes.fr",
    img: "https://i.pravatar.cc/150?img=15",
    egg: "Distribue des sourires et parfois des cookies (virtuel).",
  },
];

function ContactCard({ person }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="contact-card" onClick={() => setOpen((s) => !s)}>
      <img className="avatar" src={person.img} alt={`Photo de ${person.name}`} />
      <div className="card-body">
        <h3>{person.name}</h3>
        <p className="role">{person.role}</p>
        <p className="email">{person.email}</p>
        <p className="desc">{open ? person.egg : <em>Cliquer pour une anecdote...</em>}</p>
      </div>
    </article>
  );
}

function Contacts() {
  return (
    <main className="contacts">
      <header className="contacts-header">
        <h1>Équipe — Contacts</h1>
        <p className="intro">Nos valeureux développeurs — fidèles compagnons des longues nuits, des cafés et des commits héroïques.</p>
      </header>

      <section className="contacts-grid">
        {devs.map((d) => (
          <ContactCard key={d.email} person={d} />
        ))}
      </section>

      <footer className="contacts-footer">
        <small>C'est beau le travail</small>
      </footer>
    </main>
  );
}

export default Contacts;
