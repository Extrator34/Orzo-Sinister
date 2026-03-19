import http from "http";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import SpeedDateUser from "./SpeedDateUser.js";
import SpeedDatePairs from "./SpeedDatePairs.js";
import Canon from "./canon.js";

dotenv.config();

// Costanti
const PANEL_REQUIRED_ROLE = "1478148856620384310";
const SERVER_A_ID = "1075524277836726343";
const SERVER_B_ID = "1478148856406347958";
const ROLE_TO_GIVE = "1478148856595349760";
const ROLE_TO_REMOVE = "1478148856406347963";
const PORT = 10000;
const gifHazbin = "https://i.postimg.cc/QCw6CSJT/Charlie_XVaggie.gif";
const gifParadiso = "https://i.postimg.cc/RVjxCFSq/Emily.gif";
const gifHelluva = "https://i.postimg.cc/65Dx63WZ/Stella.gif";
const gifPeccati = "https://i.postimg.cc/nc6fVzFY/Belzebub.gif";
const cornerImage = "https://i.postimg.cc/DfWvm02Y/Charlie_ahegao.png";


const ALLOWED_VIEWERS = [
  "775474842555645972",
  "1212139044860067930",
  "570194057574350851"
];

// Client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});



// Comandi
const commands = [
  {
    name: "speeddate",
    description: "Ti inserisce nella lista dello speeddate",
    options: [
      {
        name: "image",
        description: "Carica la tua immagine",
        type: 11,
        required: true
      }
    ]
  },
  { name: "speeddate_remove", description: "Ti rimuove dalla lista dello speeddate" },
  { name: "speeddate_list", description: "Mostra la lista degli utenti iscritti (solo admin)" },
  { name: "shuffle", description: "Crea le coppie dello speeddate (solo admin)" },
  { name: "datestart", description: "Mostra la prossima coppia (solo admin)" },
  { name: "panel", description: "Mostra il pannello di verifica (solo staff)" },
  {
  name: "canonlist",
  description: "Mostra la lista dei personaggi canon (solo panel)"
},
{
  name: "canon",
  description: "Assegna un personaggio canon a un utente",
  options: [
    {
      name: "nomecanon",
      description: "Nome del personaggio canon",
      type: 3,
      required: true,
      autocomplete: true
    },
    {
      name: "utente",
      description: "Utente a cui assegnare il personaggio",
      type: 6,
      required: true
    }
  ]
},
  {
  name: "canon_remove",
  description: "Rimuove l'assegnazione di un personaggio canon",
  options: [
    {
      name: "nomecanon",
      description: "Nome del personaggio canon",
      type: 3,
      required: true,
      autocomplete: true
    }
  ]
}

  
];

// Registrazione comandi
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("🔧 Registrazione comandi slash...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comandi registrati!");
  } catch (err) {
    console.error("❌ Errore registrazione comandi:", err);
  }
}

/* ============================================================
   LISTENER COMANDI SLASH
============================================================ */

client.on("interactionCreate", async interaction => {


  // AUTOCOMPLETE CANON
if (interaction.isAutocomplete()) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === "nomecanon") {
    const query = (focused.value || "").toLowerCase();

    const canons = await Canon.find().limit(200);

    const choices = canons
      .filter(c => c.name.toLowerCase().includes(query))
      .map(c => ({ name: c.name, value: c.name }));

    return interaction.respond(
      choices.length ? choices.slice(0, 25) : [{ name: "Nessun risultato", value: "none" }]
    );
  }

  return;
}



  
  if (!interaction.isChatInputCommand()) return;

  /* SPEEDDATE */
  if (interaction.commandName === "speeddate") {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const image = interaction.options.getAttachment("image");

    if (!image || !image.contentType?.startsWith("image/")) {
      return interaction.reply({
        content: "❌ Devi caricare un file immagine valido.",
        ephemeral: true
      });
    }

    try {
      const exists = await SpeedDateUser.findOne({ userId });
      if (exists) {
        return interaction.reply({
          content: "Sei già nella lista dello speeddate!",
          ephemeral: true
        });
      }

      const mediaChannel = client.channels.cache.get("1470115948567461928");
      if (!mediaChannel || !mediaChannel.isTextBased()) {
        return interaction.reply({
          content: "❌ Errore: il canale media non è accessibile.",
          ephemeral: true
        });
      }

      const uploadedMessage = await mediaChannel.send({
        content: `📸 Immagine di <@${userId}>`,
        files: [image]
      });

      const imageUrl = uploadedMessage.attachments.first().url;

      await SpeedDateUser.create({ userId, username, imageUrl });

      return interaction.reply({
        content: "✨ Ti ho aggiunto alla lista dello speeddate!",
        ephemeral: true
      });

    } catch (err) {
      console.error("❌ Errore MongoDB:", err);
      return interaction.reply({
        content: "❌ Errore interno.",
        ephemeral: true
      });
    }
  }

  /* SPEEDDATE REMOVE */
  if (interaction.commandName === "speeddate_remove") {
    const userId = interaction.user.id;

    try {
      const removed = await SpeedDateUser.findOneAndDelete({ userId });

      if (!removed) {
        return interaction.reply({
          content: "Non eri nella lista!",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: "❎ Sei stato rimosso dalla lista.",
        ephemeral: true
      });

    } catch (err) {
      console.error("❌ Errore MongoDB:", err);
      return interaction.reply({
        content: "❌ Errore interno.",
        ephemeral: true
      });
    }
  }

  /* SPEEDDATE LIST */
  if (interaction.commandName === "speeddate_list") {
    if (!ALLOWED_VIEWERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "⛔ Non hai il permesso.",
        ephemeral: true
      });
    }

    try {
      const users = await SpeedDateUser.find();
      if (users.length === 0) {
        return interaction.reply("La lista è vuota.");
      }

      const formatted = users
        .map(u => `• <@${u.userId}> (${u.username})`)
        .join("\n");

      return interaction.reply(`📜 **Lista SpeedDate:**\n${formatted}`);

    } catch (err) {
      console.error("❌ Errore MongoDB:", err);
      return interaction.reply("❌ Errore interno.");
    }
  }

  /* SHUFFLE */
  if (interaction.commandName === "shuffle") {
    if (!ALLOWED_VIEWERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "⛔ Non hai il permesso.",
        ephemeral: true
      });
    }

    try {
      const users = await SpeedDateUser.find();
      if (users.length < 2) {
        return interaction.reply("Servono almeno 2 utenti.");
      }

      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const pairs = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) pairs.push([shuffled[i], shuffled[i + 1]]);
        else pairs.push([shuffled[i]]);
      }

      await SpeedDatePairs.findOneAndUpdate(
        {},
        { pairs, index: 0 },
        { upsert: true }
      );

      return interaction.reply("🔀 Coppie generate!");

    } catch (err) {
      console.error(err);
      return interaction.reply("❌ Errore durante la generazione.");
    }
  }

  /* DATESTART */
  if (interaction.commandName === "datestart") {
    if (!ALLOWED_VIEWERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "⛔ Non hai il permesso.",
        ephemeral: true
      });
    }

    try {
      const data = await SpeedDatePairs.findOne();
      if (!data || data.pairs.length === 0) {
        return interaction.reply("⚠️ Nessuna coppia generata.");
      }

      if (data.index >= data.pairs.length) {
        return interaction.reply("🎉 Tutte le coppie sono state mostrate!");
      }

      const pair = data.pairs[data.index];
      const userA = await client.users.fetch(pair[0].userId);
      const avatarA = pair[0].imageUrl;

      let embed;

      if (pair.length === 2) {
        const userB = await client.users.fetch(pair[1].userId);
        const avatarB = pair[1].imageUrl;

        embed = {
          title: "💘 Nuova Coppia!",
          description: `<@${pair[0].userId}> ❤️ <@${pair[1].userId}>`,
          color: 0xff66cc,
          fields: [
            { name: userA.username, value: "Partner 1", inline: true },
            { name: userB.username, value: "Partner 2", inline: true }
          ],
          thumbnail: { url: avatarA },
          image: { url: avatarB }
        };

      } else {
        embed = {
          title: "🧍 Utente senza coppia",
          description: `<@${pair[0].userId}>`,
          color: 0xffcc00,
          image: { url: avatarA }
        };
      }

      data.index += 1;
      await data.save();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      return interaction.reply("❌ Errore durante la lettura delle coppie.");
    }
  }

  /* PANEL */
  if (interaction.commandName === "panel") {
    const member = interaction.member;

    if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
      return interaction.reply({
        content: "⛔ Non hai il permesso.",
        ephemeral: true
      });
    }

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");

    const embed = new EmbedBuilder()
      .setTitle("🔐 Verifica Accesso")
      .setDescription("Clicca il bottone qui sotto per verificare la tua presenza nei server di THE PRIDE RING.")
      .setColor("Blue");

    const button = new ButtonBuilder()
      .setCustomId("verify_access")
      .setLabel("Verifica")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }



  //////////////////   CANON LIST   ///////////////////////

/* CANONLIST */
if (interaction.commandName === "canonlist") {
  const member = interaction.member;

  if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
    return interaction.reply({
      content: "⛔ Non hai il permesso.",
      ephemeral: true
    });
  }

  const canons = await Canon.find().sort({ category: 1, name: 1 });

  // Raggruppiamo per categoria
  const categories = {};
  for (const c of canons) {
    if (!categories[c.category]) categories[c.category] = [];

    if (c.assignedTo) {
      categories[c.category].push(`・ ${c.name} : <@${c.assignedTo}>`);
    } else {
      categories[c.category].push(`・ ${c.name}`);
    }
  }

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");

  // Funzione per creare embed per una categoria
  const makeEmbed = (title, list, gif, corner) => {
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${title}`)
    .setColor("#ff003c")
    .setDescription(list.join("\n"));

  if (gif) embed.setImage(gif);
  if (corner) embed.setThumbnail(corner);

  return embed;
};

 const embeds = [];

if (categories["HAZBIN HOTEL"]) 
  embeds.push(makeEmbed(
    "Hazbin Hotel",
    categories["HAZBIN HOTEL"],
    gifHazbin,
    cornerImage // SOLO QUI
  ));

if (categories["PARADISO"]) 
  embeds.push(makeEmbed(
    "Paradiso",
    categories["PARADISO"],
    gifParadiso
  ));

if (categories["HELLUVA BOSS"]) 
  embeds.push(makeEmbed(
    "Helluva Boss",
    categories["HELLUVA BOSS"],
    gifHelluva
  ));

if (categories["PECCATI CAPITALI"]) 
  embeds.push(makeEmbed(
    "Peccati Capitali",
    categories["PECCATI CAPITALI"],
    gifPeccati
  ));



  const refreshButton = new ButtonBuilder()
    .setCustomId("canon_refresh")
    .setEmoji("🔄")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(refreshButton);

  return interaction.reply({ embeds, components: [row] });
}




 //////////////////   ASSEGNA CANON   ///////////////////////


  /* CANON */
if (interaction.commandName === "canon") {
  const member = interaction.member;

  if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
    return interaction.reply({
      content: "⛔ Non hai il permesso.",
      ephemeral: true
    });
  }

  const name = interaction.options.getString("nomecanon");
  const user = interaction.options.getUser("utente");

  if (name === "none") {
    return interaction.reply({
      content: "❌ Devi selezionare un personaggio valido.",
      ephemeral: true
    });
  }

  const canon = await Canon.findOne({ name });

  if (!canon) {
    return interaction.reply({
      content: "❌ Personaggio non trovato.",
      ephemeral: true
    });
  }

  if (canon.assignedTo) {
    return interaction.reply({
      content: "❌ Questo personaggio è già assegnato.",
      ephemeral: true
    });
  }

  canon.assignedTo = user.id;
  await canon.save();

  return interaction.reply(`✅ **${name}** è stato assegnato a ${user}.`);
}


  ///////////////////   CANON REMOVE   ///////////////////////

  /* CANON REMOVE */
if (interaction.commandName === "canon_remove") {
  const member = interaction.member;

  if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
    return interaction.reply({
      content: "⛔ Non hai il permesso.",
      ephemeral: true
    });
  }

  const name = interaction.options.getString("nomecanon");

  if (name === "none") {
    return interaction.reply({
      content: "❌ Devi selezionare un personaggio valido.",
      ephemeral: true
    });
  }

  const canon = await Canon.findOne({ name });

  if (!canon) {
    return interaction.reply({
      content: "❌ Personaggio non trovato.",
      ephemeral: true
    });
  }

  if (!canon.assignedTo) {
    return interaction.reply({
      content: "ℹ️ Questo personaggio non è assegnato a nessuno.",
      ephemeral: true
    });
  }

  const oldOwner = canon.assignedTo;

  canon.assignedTo = null;
  await canon.save();

  return interaction.reply(`🔄 **${name}** è stato liberato (precedente proprietario: <@${oldOwner}>).`);
}



  
  
});

/* ============================================================
   LISTENER BOTTONI (SEPARATO!)
============================================================ */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "verify_access") {

    const serverA = client.guilds.cache.get(SERVER_A_ID);
    const serverB = client.guilds.cache.get(SERVER_B_ID);

    if (!serverA || !serverB) {
      return interaction.reply({
        content: "❌ Errore interno: server non trovati.",
        ephemeral: true
      });
    }

    // FETCH invece di CACHE
    let memberA;
    try {
      memberA = await serverA.members.fetch(interaction.user.id);
    } catch {
      memberA = null;
    }

    if (!memberA) {
      return interaction.reply({
        content: "❌ Non risulti nel server PRIDE RING.",
        ephemeral: true
      });
    }

    let memberB;
    try {
      memberB = await serverB.members.fetch(interaction.user.id);
    } catch {
      memberB = null;
    }

    if (!memberB) {
      return interaction.reply({
        content: "Come cazzo hai ottenuto questo messaggio di errore?",
        ephemeral: true
      });
    }

    try {
      await memberB.roles.add(ROLE_TO_GIVE);
    } catch (err) {
      console.error("Errore assegnazione ruolo:", err);
      return interaction.reply({
        content: "❌ Non posso assegnarti il ruolo.",
        ephemeral: true
      });
    }

    try {
  await memberB.roles.remove(ROLE_TO_REMOVE);
} catch (err) {
  console.error("Errore rimozione ruolo:", err);
  return interaction.reply({
    content: "❌ Non posso rimuovere il ruolo.",
    ephemeral: true
  });
}


    return interaction.reply({
      content: "✅ Verifica completata! Hai ricevuto il ruolo.",
      ephemeral: true
    });
  }


  ///////////////   REFRESH   /////////////////

if (interaction.customId === "canon_refresh") {
  const member = interaction.member;

  if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
    return interaction.reply({
      content: "⛔ Non hai il permesso.",
      ephemeral: true
    });
  }

  const canons = await Canon.find().sort({ category: 1, name: 1 });

  const categories = {};
  for (const c of canons) {
    if (!categories[c.category]) categories[c.category] = [];

    if (c.assignedTo) {
      categories[c.category].push(`・ ${c.name} : <@${c.assignedTo}>`);
    } else {
      categories[c.category].push(`・ ${c.name}`);
    }
  }

  const { EmbedBuilder } = await import("discord.js");
  const makeEmbed = (title, list, gif, corner) => {
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${title}`)
    .setColor("#ff003c")
    .setDescription(list.join("\n"));

  if (gif) embed.setImage(gif);
  if (corner) embed.setThumbnail(corner);

  return embed;
};


   const embeds = [];

if (categories["HAZBIN HOTEL"]) 
  embeds.push(makeEmbed(
    "Hazbin Hotel",
    categories["HAZBIN HOTEL"],
    gifHazbin,
    cornerImage // SOLO QUI
  ));

if (categories["PARADISO"]) 
  embeds.push(makeEmbed(
    "Paradiso",
    categories["PARADISO"],
    gifParadiso
  ));

if (categories["HELLUVA BOSS"]) 
  embeds.push(makeEmbed(
    "Helluva Boss",
    categories["HELLUVA BOSS"],
    gifHelluva
  ));

if (categories["PECCATI CAPITALI"]) 
  embeds.push(makeEmbed(
    "Peccati Capitali",
    categories["PECCATI CAPITALI"],
    gifPeccati
  ));

  return interaction.update({ embeds });
}
});
/* ============================================================
   READY + KEEP ALIVE + START
============================================================ */

client.once("ready", () => {
  console.log(`🤖 Loggato come ${client.user.tag}`);
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot attivo");
});
server.listen(PORT, () => {
  console.log(`🌐 Keep-alive su porta ${PORT}`);
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connesso a MongoDB");
  } catch (err) {
    console.error("❌ Errore connessione MongoDB:", err);
  }

  await registerCommands();

  client.login(process.env.TOKEN)
    .then(() => console.log("🔐 Login effettuato"))
    .catch(err => console.error("❌ Errore login:", err));
}

start();
