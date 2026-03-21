import http from "http";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Canon from "./canon.js";

dotenv.config();

// Costanti
const PANEL_REQUIRED_ROLE = "779080986310213642";
const PORT = 10000;

const gifHazbin = "https://i.postimg.cc/tgnBG8cR/sinister_inferno.png";
const gifParadiso = "https://i.postimg.cc/PqvSn07X/sinister_paradiso.png";
const gifHelluva = "https://i.postimg.cc/65Dx63WZ/Stella.gif";
const gifPeccati = "https://i.postimg.cc/nc6fVzFY/Belzebub.gif";

// Client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

// Comandi
const commands = [
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

  /* CANONLIST */
  /* CANONLIST */
if (interaction.commandName === "canonlist") {
  const member = interaction.member;

  if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
    return interaction.reply({
      content: "⛔ Non hai il permesso.",
      ephemeral: true
    });
  }

  const canons = await Canon.find().sort({ category: 1, subCategory: 1, name: 1 });

  const categories = {};

  for (const c of canons) {
    if (!categories[c.category]) categories[c.category] = {};
    if (!categories[c.category][c.subCategory]) categories[c.category][c.subCategory] = [];

    if (c.assignedTo) {
      categories[c.category][c.subCategory].push(`・ ${c.name} : <@${c.assignedTo}>`);
    } else {
      categories[c.category][c.subCategory].push(`・ ${c.name}`);
    }
  }

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");

  const makeEmbed = (title, groups, gif, color) => {
    let description = "";

    for (const sub of Object.keys(groups)) {
      description += `\n**→ ${sub}:**\n`;
      description += groups[sub].join("\n") + "\n";
    }

    const embed = new EmbedBuilder()
      .setTitle(` ${title}`)
      .setColor(color)
      .setDescription(description);

    if (gif) embed.setImage(gif);

    return embed;
  };

  const embeds = [];

  if (categories["INFERNO"]) {
    embeds.push(makeEmbed("Inferno", categories["INFERNO"], gifHazbin, "#ff003c"));
  }

  if (categories["PARADISO"]) {
    embeds.push(makeEmbed("Paradiso", categories["PARADISO"], gifParadiso, "#f7d400"));
  }

  const refreshButton = new ButtonBuilder()
    .setCustomId("canon_refresh")
    .setEmoji("🔄")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(refreshButton);

  return interaction.reply({ embeds, components: [row] });
}


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
   LISTENER BOTTONI
============================================================ */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "canon_refresh") {
    const member = interaction.member;

    if (!member.roles.cache.has(PANEL_REQUIRED_ROLE)) {
      return interaction.reply({
        content: "⛔ Non hai il permesso.",
        ephemeral: true
      });
    }

    const canons = await Canon.find().sort({ category: 1, subCategory: 1, name: 1 });

    const categories = {};

    for (const c of canons) {
      if (!categories[c.category]) categories[c.category] = {};
      if (!categories[c.category][c.subCategory]) categories[c.category][c.subCategory] = [];

      if (c.assignedTo) {
        categories[c.category][c.subCategory].push(`・ ${c.name} : <@${c.assignedTo}>`);
      } else {
        categories[c.category][c.subCategory].push(`・ ${c.name}`);
      }
    }

    const { EmbedBuilder } = await import("discord.js");

    const makeEmbed = (title, groups, gif, color) => {
      let description = "";

      for (const sub of Object.keys(groups)) {
        description += `\n**→ ${sub}:**\n`;
        description += groups[sub].join("\n") + "\n";
      }

      const embed = new EmbedBuilder()
        .setTitle(` ${title}`)
         .setColor(color)
        .setDescription(description);

      if (gif) embed.setImage(gif);

      return embed;
    };

    const embeds = [];

    if (categories["INFERNO"]) {
      embeds.push(makeEmbed("Inferno", categories["INFERNO"], gifHazbin, "#ff003c"));
    }

    if (categories["PARADISO"]) {
       embeds.push(makeEmbed("Paradiso", categories["PARADISO"], gifParadiso, "#f7d400"));
    }

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
