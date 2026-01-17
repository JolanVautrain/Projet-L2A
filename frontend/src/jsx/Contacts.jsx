import PropTypes from "prop-types";
import { useState } from "react";
import "../css/Index.css";
import "../css/Contacts.css";
import jolanImg from "../assets/contacts/jolan.png";
import gabImg from "../assets/contacts/gab.jpg";
import ethanImg from "../assets/contacts/ethan.jpg";
import laloImg from "../assets/contacts/lalo.jpg";

// Données des développeurs
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
    img: gabImg,
    egg: "Détient un record personnel : 42 pull-requests en une journée.",
  },
  {
    name: "Ethan Louis",
    role: "Le travailleur mécontent",
    email: "ethan.louis@etudiant.univ-rennes.fr",
    img: ethanImg,
    egg: "Râle mais délivre ; spécialiste des fixes 23:00.",
  },
  {
    name: "Lalo Lucas",
    role: "Heureux dans la vie",
    email: "lalo.lucas@etudiant.univ-rennes.fr",
    img: laloImg,
    egg: "Distribue des sourires et parfois des cookies (virtuel).",
  },
];

/**
 * Composant ContactCard
 * Affiche une carte de contact pour un membre de l'équipe.
 *
 * Props :
 * - person (object) : données du membre de l'équipe
 * 
 */
function ContactCard({ person }) {
  // État pour gérer l'affichage de l'anecdote
  const [open, setOpen] = useState(false);
  // Rendu de la carte de contact
  return (
    <button
      type="button"
      className="contact-card"
      onClick={() => setOpen((s) => !s)}
      aria-expanded={open}
      aria-label={open ? `Masquer l'anecdote de ${person.name}` : `Afficher l'anecdote de ${person.name}`}
      style={{ border: 'none', background: 'none', padding: 0, textAlign: 'inherit' }}
    >
      <img className="avatar" src={person.img} alt={person.name} />
      <div className="card-body">
        <h3>{person.name}</h3>
        <p className="role">{person.role}</p>
        <p className="email">{person.email}</p>
        <p className="desc">{open ? person.egg : <em>Cliquer pour une anecdote...</em>}</p>
      </div>
    </button>
  );
}

// PropTypes validation pour le composant ContactCard
ContactCard.propTypes = {
  person: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    img: PropTypes.string.isRequired,
    egg: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * Composant Contacts
 * Affiche la liste des membres de l'équipe avec leurs informations.
 */
function Contacts() {
  // Rendu du composant Contacts
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
