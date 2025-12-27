const fs = require('fs');
const path = require('path');

const translations = {
  en: {
    time_tracking: {
      overnight_shift: "Overnight Shift",
      long_shift_warning: "Long Shift",
      duration_label: "Duration",
      next_day_indicator: "+1 day",
      multiple_days_indicator: "+{count} days",
      auto_closed_indicator: "Auto-closed - Requires Review",
      hours_abbrev: "h",
      minutes_abbrev: "m"
    }
  },
  es: {
    time_tracking: {
      overnight_shift: "Turno Nocturno",
      long_shift_warning: "Turno Largo",
      duration_label: "Duración",
      next_day_indicator: "+1 día",
      multiple_days_indicator: "+{count} días",
      auto_closed_indicator: "Auto-cerrado - Requiere Revisión",
      hours_abbrev: "h",
      minutes_abbrev: "m"
    }
  },
  'pt-BR': {
    time_tracking: {
      overnight_shift: "Turno Noturno",
      long_shift_warning: "Turno Longo",
      duration_label: "Duração",
      next_day_indicator: "+1 dia",
      multiple_days_indicator: "+{count} dias",
      auto_closed_indicator: "Fechado Automaticamente - Requer Revisão",
      hours_abbrev: "h",
      minutes_abbrev: "m"
    }
  }
};

const languages = ['en', 'es', 'pt-BR'];

languages.forEach(lang => {
  const filePath = path.join(__dirname, '..', 'public', 'translations', lang, 'detail_hub.json');

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Add time_tracking translations to timecard section
    if (data.timecard) {
      data.timecard.time_tracking = translations[lang].time_tracking;

      // Write back to file with pretty formatting
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log(`✅ Successfully added time_tracking translations to ${lang}/detail_hub.json`);
    } else {
      console.log(`⚠️  Warning: timecard section not found in ${lang}/detail_hub.json`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${lang}/detail_hub.json:`, error.message);
  }
});

console.log('\n✅ Translation update complete!');
