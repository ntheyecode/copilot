// Edition wording overlay: INDIVIDUALS, locale fr. Same keys as en.js
// of this folder (gate: scripts/check-edition-copy.mjs); index-keyed objects
// patch single list elements (src/i18n/overlay_merge.js).
export default {
  footer: {
    sales: "Parlez-nous"
  },
  seo: {
    'how-it-works': {
      description: "Tout ce que fait WorkCoPilot : un guidage pas à pas sur votre écran, la commande ou le clic exact, en partant de zéro, en repérant et corrigeant les erreurs, dans n'importe quelle app, appuyé sur vos propres documents, un compte rendu que vous gardez, toujours à jour en apprenant vos outils, un coach avant la tâche, vos propres compétences, l'expurgation sur l'appareil avec SAST et vérification des dépendances en direct, et des plans issus de l'IA la plus puissante à votre portée."
    },
    fields: {
      description: "WorkCoPilot guide le travail concret dans les {total} domaines où il excelle, répartis en {families} familles, du logiciel et de la sécurité à la finance, aux opérations et au marketing. Un seul guide pour chaque type de travail que vous faites."
    },
    pricing: {
      description: "Les forfaits WorkCoPilot comparés : Lite, Basic, Advanced et Premium, avec des heures de guidage en direct par mois, l'import de documents, les visuels générés, la sécurité sur chaque forfait, et les conditions d'heures supplémentaires et d'annulation."
    },
    contact: {
      description: "Contactez-nous au sujet de WorkCoPilot : le produit, votre offre, la sécurité, la confidentialité ou toute autre question. Écrivez-nous et nous vous répondrons."
    }
  },
  home: {
    everywhere: {
      cards: {
        0: {
          chips: [
            "Windows",
            "Web",
            "Android",
            "OCR sur l'appareil"
          ]
        }
      }
    },
    final: {
      note2: "Connectez-vous avec Google, Microsoft ou Facebook, ou avec votre e-mail et votre mot de passe."
    }
  },
  login: {
    meta: {
      description: "Créez votre compte WorkCoPilot ou connectez-vous pour être guidé pas à pas sur votre propre écran."
    },
    stage: {
      learnS: "Net 30 vient de vos propres notes, gardées privées dans votre compte."
    },
    pitchP: "WorkCoPilot regarde votre écran, vous donne la prochaine action exacte et repère un faux pas avant qu'il ne vous coûte. Il apprend les applications que vous utilisez, en privé.",
    tabs: {
      email: "E-mail"
    },
    form: {
      improve: "Pour améliorer WorkCoPilot, les compétences et contenus que vous ajoutez peuvent être utilisés sous forme anonymisée pour améliorer le service. Vos données personnelles sont d'abord retirées sur votre appareil. <a>En savoir plus</a>."
    }
  },
  pricing: {
    notes: {
      items: [
        {
          t: "Des minutes, pas des blocs",
          d: "Dépensez vos heures quelques minutes à la fois tout au long du mois, facturées à la minute utilisée, jamais arrondies à l'heure."
        },
        {
          t: "Temps supplémentaire",
          d: "Un mois chargé ? Ajoutez une heure dès que vous en avez besoin. Le temps acheté n'expire jamais."
        },
        {
          t: "Facturation",
          d: "Facturé mensuellement, annuel avec remise là où c'est disponible. Résiliez vous-même à tout moment, sans engagement."
        },
        {
          t: "Rien qu'à vous",
          d: "Chaque offre est pour une seule personne : vos sessions, vos compétences et votre historique restent sur votre propre compte."
        }
      ]
    }
  },
  how: {
    projects: {
      d: "Un grand objectif devient une carte planifiée de tâches avec une ligne d'arrivée, chacune guidée à l'écran à son tour et tirant parti de la précédente, avec Premium."
    }
  },
  howItWorks: {
    viz: {
      enterprise: {
        alt: "Illustration : une alerte de sécurité, un badge de connexion à deux facteurs et un rapport scellé",
        sso: "2FA"
      }
    },
    cards: {
      8: {
        d: "Apprend comment vos outils fonctionnent aujourd'hui, pour que le guidage ne devienne jamais périmé."
      },
      12: {
        t: "Des preuves que vous gardez",
        d: "Alertes de sécurité, rapports de session scellés alignés sur les référentiels de conformité auxquels vous rendez compte, et un compte rendu de chaque tâche, prêt à partager avec un client ou un auditeur."
      }
    },
    feature: {
      points: {
        1: "Votre frontière de données tient : chaque appel reste sur la clé utilisée, y compris la vôtre."
      }
    }
  },
  faqPage: {
    groups: {
      how: {
        items: {
          3: {
            d: "Vous pouvez désactiver les captures d'écran jalons à tout moment."
          }
        }
      },
      security: {
        items: {
          1: {
            a: "Oui. Ajoutez vos propres mots et motifs à expurger, tokeniser ou bloquer, par-dessus les détecteurs intégrés, et des préréglages de conformité s'activent en un clic."
          },
          2: {
            a: "Oui. Faites fonctionner WorkCoPilot sur votre propre clé IA et chaque appel reste sur cette clé, à l'intérieur de votre propre relation fournisseur, sans rien de réacheminé en silence.",
            d: "Les clés sont chiffrées au repos."
          },
          4: {
            a: "Non. Tout ce qui est à votre écran ou saisi dans une tâche est traité comme une information sur le travail, jamais comme des instructions. Les tentatives de lui faire enfreindre ses règles ou d'atteindre des données qui ne sont pas les vôtres sont refusées et consignées dans votre journal d'activité."
          }
        }
      },
      pricing: {
        items: {
          0: {
            a: "Quatre offres, Lite, Basic, Advanced et Premium, chacune avec des tâches majeures guidées et des heures de guidage en direct chaque mois. Les prix actuels sont côte à côte sur la page des tarifs."
          }
        }
      },
      current: {
        items: {
          1: {
            q: "Apprend-il de mon travail, et que ne conserve-t-il jamais ?",
            a: "Il apprend comment vos outils fonctionnent actuellement, pour que la tâche suivante démarre plus affûtée. Les apprentissages sont généralisés et désidentifiés : jamais de données personnelles, de secrets, d'images d'écran ou de contenu de document."
          }
        }
      },
      who: {
        items: {
          0: {
            a: "À quiconque doit accomplir un vrai travail sur un écran : ingénieurs, spécialistes IT et sécurité, fondateurs, indépendants, travail en opérations, finance et conformité, et tâches du quotidien. Il est le plus fort sur le travail opérationnel, technique, administratif et pratique, et sur le code."
          }
        }
      },
      compliance: {
        items: {
          1: {
            a: "Un rapport par session, un journal d'audit et votre historique de session, chiffrés au repos, jusqu'à ce que vous les supprimiez ou qu'une fenêtre de conservation les purge. Les images d'écran brutes, les documents source téléversés et les vraies valeurs sensibles ne sont pas stockés."
          }
        }
      },
      start: {
        items: {
          2: {
            a: "Écrivez à {support} pour l'aide produit et la facturation, à {legal} pour la confidentialité, le juridique ou la sécurité, et à {sales} pour tout le reste. Nous répondons sous un jour ouvré."
          }
        }
      }
    }
  },
  securityPage: {
    guarantees: {
      2: {
        d: "Mot de passe et connexion via les réseaux sociaux passent tous deux par le même second facteur."
      },
      5: {
        d: "Fonctionne avec notre IA ou avec votre propre clé IA. Lecture seule : il vous guide, il ne modifie jamais vos systèmes."
      }
    },
    facts: {
      retention: "<b>Conservé jusqu'à ce que vous le supprimiez.</b> Supprimez n'importe quelle session à tout moment. Une fenêtre de conservation automatique peut purger les sessions anciennes selon un calendrier."
    },
    compliance: {
      sub: "Vous activez une politique pour votre compte et elle s'applique à chaque session. Chaque session est journalisée et exportable en rapport. Les préréglages cochés sont livrés prêts à activer.",
      honest: "Nous fournissons les contrôles et les preuves. Nous ne revendiquons aucune certification sur quelque référentiel que ce soit ; la conformité relève de vous et de vos auditeurs."
    },
    contact: {
      issue: "<b>Vous avez trouvé une faille de sécurité ?</b> Écrivez à <a>support@admireveda.com</a> (sécurité, confidentialité, conformité). Laissez-nous le temps de confirmer et de corriger avant toute divulgation publique ; la recherche de bonne foi est la bienvenue."
    }
  },
  contactPage: {
    lead: "Des questions sur WorkCoPilot, votre offre, la sécurité, la confidentialité ou tout autre sujet. Envoyez un mot et nous vous répondrons.",
    form: {
      emailPlaceholder: "vous@exemple.com",
      note: "Pour les questions de sécurité, de confidentialité ou de facturation, mentionnez-le ci-dessus et la bonne personne vous répondra."
    },
    done: {
      body: "Votre message est en route vers nous, et une confirmation part vers <b>{email}</b>. Nous vous recontacterons sous peu."
    }
  },
  onboarding: {
    account: {
      emailPh: "vous@exemple.com"
    }
  },
  widgets: {
    validate: {
      workEmailPh: "camille@exemple.com"
    }
  },
  setPasswordPage: {
    foot: "Une sécurité solide sur chaque compte · AdmireVeda WorkCoPilot"
  },
  helpPage: {
    desktopsec: {
      items: {
        3: "<b>Le moins de données part.</b> Pour vous guider, des images d'écran réduites et le texte protégé vont au service d'IA (le nôtre, ou votre propre clé). Quand la protection des données est activée, les valeurs sensibles sont retirées ou tokenisées <b>avant</b> tout envoi, et reconstruites sur votre appareil."
      }
    },
    redactShot: {
      caption: "Protection des données activée : les valeurs sensibles sont retirées sur votre appareil avant que quoi que ce soit ne le quitte."
    },
    flow: {
      steps: {
        answer: {
          d: "Outils, puis <b>Répondre</b>, puis <b>Obtenir le résultat</b>. La carte donne le résultat, sa confiance, comment il l'a obtenu, comment le vérifier, et tout signalement de politique.",
          alt: "La carte Réponse : le résultat, une jauge de confiance, comment je l'ai obtenu, vérifier par, la vérification de sécurité et les signalements de politique."
        }
      }
    },
    record: {
      tip: "Le rapport est pratique comme runbook pour la prochaine fois, ou à partager avec quelqu'un qui doit faire la même tâche. Chaque capture d'écran est expurgée sur votre appareil avant capture - seule l'image nettoyée est jamais stockée."
    }
  },
  dashboardsHelp: {
    home: {
      lead: "Le tableau de bord est votre accueil : votre plan en un coup d'œil (heures ce mois-ci, recharges, tâches ouvertes), la seule chose à faire ensuite, et là où vous vous êtes arrêté.",
      shot: {
        caption: "Le tableau de bord. La carte orange Démarrer une tâche lance un nouveau travail ; vos tâches ouvertes sont juste en dessous."
      },
      steps: {
        0: "<b>Lisez votre plan.</b> Les trois tuiles indiquent les heures restantes ce mois-ci, toute recharge, et vos créneaux de tâches ouverts. La pastille de temps en haut passe à l'ambre avant que vous ne soyez à court.",
        2: "<b>Ajoutez du temps.</b> Appuyez sur <b>Ajouter du temps</b> en haut pour acheter des heures de recharge."
      }
    }
  },
  workDashboard: {
    buy: {
      bodyMonth: "Les heures de votre offre sont renouvelées le {date}. Les heures de recharge n'expirent jamais et s'ajoutent à votre offre."
    },
    del: {
      note: "Ceci est consigné dans le journal d'activité de votre compte : quand elle a été supprimée, le motif et le sujet de la session."
    },
    plan: {
      choose: "Pas encore d'offre sur ce compte"
    }
  },
  workShell: {
    logs: {
      deleteNote: "Ceci est consigné dans le journal d'activité de votre compte : quand elle a été supprimée, le motif et le sujet de la session."
    },
    noAccess: {
      body: "Votre compte n'a pas encore accès à WorkCoPilot. Contactez le support et nous réglerons cela."
    }
  },
  workStart: {
    notReady: "Remplissez ceci dès maintenant. La dernière étape se débloque dès que la configuration de l'IA sur ce service est terminée.",
    beginNotReady: "La dernière étape s'ouvre dès que la configuration de l'IA sur ce service est terminée.",
    fSaasAppPh: "par ex. Salesforce, Shopify"
  },
  workProjects: {
    gate: {
      title: "Les grands projets avec Premium"
    },
    inject: {
      ph: "p. ex. Configurer la connexion à deux facteurs pour le portail"
    }
  },
  skillsPage: {
    note: {
      global: "<b>Aide tout le monde.</b> Les compétences que vous ajoutez peuvent être utilisées sous forme désidentifiée pour améliorer WorkCoPilot pour tous les utilisateurs ; les données personnelles sont retirées avant stockage. Vous avez accepté cela à l'inscription."
    },
    lead: "Les compétences apprennent à WorkCoPilot comment vous voulez que le travail soit fait, pour que le guidage s'aligne sur vos outils, standards et terminologie. Collez un playbook, une SOP, ou une compétence exportée depuis n'importe quelle IA."
  },
  guideConsole: {
    policy: {
      flag: "Votre politique, {kind} : {title}"
    }
  },
  policyNote: {
    headFlag: "Votre politique : à vérifier avant utilisation",
    headClean_one: "Votre politique : conforme (vérifié selon {n} règle)",
    headClean_other: "Votre politique : conforme (vérifié selon {n} règles)",
    cleanBody: "Ce conseil a été vérifié au regard de votre politique de sécurité et rien n'a été signalé."
  },
  guideLevel: {
    levels: { executive: { label: "Bref", short: "Bref" } },
  },
}
