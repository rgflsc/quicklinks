// Lightweight in-page internationalization. The active language is chosen by
// the user in Settings (persisted); it does not depend on the browser UI
// language, so chrome.i18n / _locales is intentionally not used here.
(() => {
  const DICT = {
    en: {
      searchPlaceholder: "Search the web or enter an address",
      settings: "Settings",
      theme: "Theme",
      night: "Night",
      day: "Day",
      language: "Language",
      searchEngine: "Search engine",
      browserDefault: "Browser default",
      showTitles: "Show titles under tiles",
      resetAll: "Reset all",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      name: "Name",
      url: "URL",
      iconUrl: "Icon URL (optional)",
      iconUrlPlaceholder: "Leave empty to auto-detect",
      addSectionBtn: "+ Add section",
      addSection: "Add section",
      editSection: "Edit section",
      addSubsectionBtn: "+ Add subsection",
      addSubsection: "Add subsection",
      editSubsection: "Edit subsection",
      thisSubsection: "this subsection",
      confirmDeleteSubsection: 'Delete subsection "{name}" and all its shortcuts?',
      sectionNamePlaceholder: "Work",
      addShortcut: "Add shortcut",
      editShortcut: "Edit shortcut",
      shortcutNamePlaceholder: "Example",
      edit: "Edit",
      collapseSection: "Collapse section",
      expandSection: "Expand section",
      thisSection: "this section",
      confirmDeleteSection: 'Delete section "{name}" and all its shortcuts?',
      confirmReset: "Reset all sections, shortcuts and settings to defaults?",
      maxShortcuts: "Each section can hold up to {max} shortcuts.",
      searchEngineTitle: "Search engine: {label}",
    },
    "pt-br": {
      searchPlaceholder: "Pesquise na web ou digite um endereço",
      settings: "Configurações",
      theme: "Tema",
      night: "Escuro",
      day: "Claro",
      language: "Idioma",
      searchEngine: "Mecanismo de busca",
      browserDefault: "Padrão do navegador",
      showTitles: "Mostrar títulos nos atalhos",
      resetAll: "Redefinir tudo",
      close: "Fechar",
      save: "Salvar",
      cancel: "Cancelar",
      delete: "Excluir",
      name: "Nome",
      url: "URL",
      iconUrl: "URL do ícone (opcional)",
      iconUrlPlaceholder: "Deixe vazio para detectar automaticamente",
      addSectionBtn: "+ Adicionar seção",
      addSection: "Adicionar seção",
      editSection: "Editar seção",
      addSubsectionBtn: "+ Adicionar subseção",
      addSubsection: "Adicionar subseção",
      editSubsection: "Editar subseção",
      thisSubsection: "esta subseção",
      confirmDeleteSubsection: 'Excluir a subseção "{name}" e todos os seus atalhos?',
      sectionNamePlaceholder: "Trabalho",
      addShortcut: "Adicionar atalho",
      editShortcut: "Editar atalho",
      shortcutNamePlaceholder: "Exemplo",
      edit: "Editar",
      collapseSection: "Recolher seção",
      expandSection: "Expandir seção",
      thisSection: "esta seção",
      confirmDeleteSection: 'Excluir a seção "{name}" e todos os seus atalhos?',
      confirmReset: "Redefinir todas as seções, atalhos e configurações para o padrão?",
      maxShortcuts: "Cada seção pode ter até {max} atalhos.",
      searchEngineTitle: "Mecanismo de busca: {label}",
    },
    es: {
      searchPlaceholder: "Busca en la web o escribe una dirección",
      settings: "Configuración",
      theme: "Tema",
      night: "Oscuro",
      day: "Claro",
      language: "Idioma",
      searchEngine: "Motor de búsqueda",
      browserDefault: "Predeterminado del navegador",
      showTitles: "Mostrar títulos en los accesos directos",
      resetAll: "Restablecer todo",
      close: "Cerrar",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      name: "Nombre",
      url: "URL",
      iconUrl: "URL del icono (opcional)",
      iconUrlPlaceholder: "Déjalo vacío para detectarlo automáticamente",
      addSectionBtn: "+ Añadir sección",
      addSection: "Añadir sección",
      editSection: "Editar sección",
      addSubsectionBtn: "+ Añadir subsección",
      addSubsection: "Añadir subsección",
      editSubsection: "Editar subsección",
      thisSubsection: "esta subsección",
      confirmDeleteSubsection: '¿Eliminar la subsección "{name}" y todos sus accesos directos?',
      sectionNamePlaceholder: "Trabajo",
      addShortcut: "Añadir acceso directo",
      editShortcut: "Editar acceso directo",
      shortcutNamePlaceholder: "Ejemplo",
      edit: "Editar",
      collapseSection: "Contraer sección",
      expandSection: "Expandir sección",
      thisSection: "esta sección",
      confirmDeleteSection: '¿Eliminar la sección "{name}" y todos sus accesos directos?',
      confirmReset: "¿Restablecer todas las secciones, accesos directos y configuración a los valores predeterminados?",
      maxShortcuts: "Cada sección puede tener hasta {max} accesos directos.",
      searchEngineTitle: "Motor de búsqueda: {label}",
    },
  };

  const LANGS = ["en", "pt-br", "es"];

  function normLang(lang) {
    return LANGS.includes(lang) ? lang : "en";
  }

  function t(lang, key, vars) {
    const d = DICT[normLang(lang)] || DICT.en;
    let s = d[key] != null ? d[key] : DICT.en[key] != null ? DICT.en[key] : key;
    if (vars) {
      for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    }
    return s;
  }

  function applyStatic(lang) {
    const l = normLang(lang);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(l, el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(l, el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(l, el.getAttribute("data-i18n-title")));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(l, el.getAttribute("data-i18n-aria-label")));
    });
    document.documentElement.lang = l === "pt-br" ? "pt-BR" : l;
  }

  function pickDefault() {
    const n = (navigator.language || "en").toLowerCase();
    if (n.startsWith("pt")) return "pt-br";
    if (n.startsWith("es")) return "es";
    return "en";
  }

  window.QLI18N = { t, applyStatic, pickDefault, normLang, LANGS };
})();
