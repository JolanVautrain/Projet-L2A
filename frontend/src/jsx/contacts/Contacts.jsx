import PropTypes from "prop-types";
import { useState } from "react";
import { useLanguage } from "../autres/Language.jsx";
import "../../static/css/Index.css";
import "../../static/css/Contacts.css";
import jolanImg from "../../static/assets/contacts/jolan.png";
import gabImg from "../../static/assets/contacts/gab.jpg";
import ethanImg from "../../static/assets/contacts/ethan.jpg";
import laloImg from "../../static/assets/contacts/lalo.jpg";

/**
 * Composant ContactCard
 * Affiche une carte de contact pour un membre de l'équipe.
 *
 * Props :
 * - person (object) : données du membre de l'équipe
 * - t (function) : fonction de traduction
 */
function ContactCard({ person, t }) {
  // État pour gérer l'affichage de l'anecdote
  const [open, setOpen] = useState(false);
  // Rendu de la carte de contact
  return (
    <button
      type="button"
      className="contact-card"
      onClick={() => setOpen((s) => !s)}
      aria-expanded={open}
      aria-label={open ? `${t("contacts.hideAnecdote")} ${person.name}` : `${t("contacts.showAnecdote")} ${person.name}`}
    >
      <img className="avatar" src={person.img} alt={person.name} />
      <div className="card-body">
        <h3>{person.name}</h3>
        <p className="role">{person.role}</p>
        <p className="email">{person.email}</p>
        <p className="desc">{open ? person.egg : <em>{t("contacts.clickForAnecdote")}</em>}</p>
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
  t: PropTypes.func.isRequired,
};

/**
 * Composant Contacts
 * Affiche la liste des membres de l'équipe avec leurs informations.
 */
function Contacts() {
  const { t } = useLanguage();
  // Données des développeurs avec traductions
  const devs = [
    {
      name: "Jolan Vautrain",
      role: t("contacts.jolan.role"),
      email: "jolan.vautrain@etudiant.univ-rennes.fr",
      img: jolanImg,
      egg: t("contacts.jolan.egg"),
    },
    {
      name: "Gabriel Salaun",
      role: t("contacts.gabriel.role"),
      email: "gabriel.salaun@etudiant.univ-rennes.fr",
      img: gabImg,
      egg: t("contacts.gabriel.egg"),
    },
    {
      name: "Ethan Louis",
      role: t("contacts.ethan.role"),
      email: "ethan.louis@etudiant.univ-rennes.fr",
      img: ethanImg,
      egg: t("contacts.ethan.egg"),
    },
    {
      name: "Lalo Lucas",
      role: t("contacts.lalo.role"),
      email: "lalo.lucas@etudiant.univ-rennes.fr",
      img: laloImg,
      egg: t("contacts.lalo.egg"),
    },
  ];
  // Rendu du composant Contacts
  return (
    <main className="contacts">
      <header className="contacts-header">
        <h1>{t("contacts.title")}</h1>
        <p className="intro">{t("contacts.intro")}</p>
      </header>
      <section className="contacts-grid">
        {devs.map((d) => (
          <ContactCard key={d.email} person={d} t={t} />
        ))}
      </section>
      <footer className="contacts-footer">
        <small>{t("contacts.footer")}</small>
      </footer>
    </main>
  );
}

export default Contacts;
