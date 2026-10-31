// Edition wording overlay: INDIVIDUALS, locale zh. Same keys as en.js
// of this folder (gate: scripts/check-edition-copy.mjs); index-keyed objects
// patch single list elements (src/i18n/overlay_merge.js).
export default {
  footer: {
    sales: "联系我们"
  },
  seo: {
    'how-it-works': {
      description: "WorkCoPilot 所做的一切：在您的屏幕上逐步引导，给出精确的命令或点击，从零开始，发现并纠正错误，适用于任何应用，依据您自己的文档，留下您保存的记录，通过学习您的工具保持最新，任务前的教练，您自己的技能，在设备上进行脱敏并配合 SAST 与实时依赖检查，以及来自您可用的最强 AI 的方案。"
    },
    fields: {
      description: "WorkCoPilot 引导 {families} 个门类下 {total} 个专业领域的工作，从软件与安全到财务、运营和营销。您做的每一种工作，都有同一位引导者。"
    },
    pricing: {
      description: "WorkCoPilot 各套餐对比：Lite、Basic、Advanced 和 Premium，含每月实时引导小时数、文档上传、生成图像、每个套餐都内置安全，以及加购小时与取消条款。"
    },
    contact: {
      description: "就 WorkCoPilot 的产品、您的套餐、安全、隐私或任何其他问题联系我们。给我们留言，我们会回复您。"
    }
  },
  home: {
    everywhere: {
      cards: {
        0: {
          chips: [
            "Windows",
            "网页",
            "Android",
            "设备端 OCR"
          ]
        }
      }
    },
    final: {
      note2: "用 Google、Microsoft 或 Facebook 登录，或用您的邮箱和密码登录。"
    }
  },
  login: {
    meta: {
      description: "创建您的 WorkCoPilot 账户或登录，在您自己的屏幕上获得分步引导。"
    },
    stage: {
      learnS: "Net 30 来自您自己的笔记，仅您的账户私有。"
    },
    pitchP: "WorkCoPilot 观察您的屏幕，告诉您确切的下一步，并在走错一步让您付出代价之前就发现它。它会私密地学习您使用的应用。",
    tabs: {
      email: "邮箱"
    },
    form: {
      improve: "为改进 WorkCoPilot，您添加的技能和内容可能以去标识化的形式用于提升服务。您的个人数据会先在您的设备上被剥离。<a>了解更多</a>。"
    }
  },
  pricing: {
    notes: {
      items: [
        {
          t: "按分钟，不按整块",
          d: "一个月里每次用几分钟都可以，按实际使用的分钟计费，绝不向上取整到小时。"
        },
        {
          t: "加购时间",
          d: "这个月很忙？随时加购 1 小时。购买的时间永不过期。"
        },
        {
          t: "计费",
          d: "按月计费，在可用地区提供年付折扣。无合同，随时可自行取消。"
        },
        {
          t: "只属于您",
          d: "每个套餐都是单人套餐：您的会话、技能和历史记录都留在您自己的账户里。"
        }
      ]
    }
  },
  how: {
    projects: {
      d: "大目标会变成带终点线的任务图，每个任务依次在您的屏幕上获得指引，并从上一个任务中学习。适用于 Premium。"
    }
  },
  howItWorks: {
    viz: {
      enterprise: {
        alt: "插图：一条安全警报、一个双重验证登录徽章和一份密封的报告",
        sso: "2FA"
      }
    },
    cards: {
      8: {
        d: "学习您的工具如今的工作方式，使引导永不过时。"
      },
      12: {
        t: "可以留存的凭证",
        d: "安全警报、映射到您所遵循的合规框架的密封会话报告，以及每项任务的书面记录，可直接分享给客户或审计方。"
      }
    },
    feature: {
      points: {
        1: "您的数据边界得以保持：每次调用都停留在所用的密钥上，包括您自己的密钥。"
      }
    }
  },
  faqPage: {
    groups: {
      how: {
        items: {
          3: {
            d: "您可以随时关闭里程碑屏幕截图。"
          }
        }
      },
      security: {
        items: {
          1: {
            a: "可以。在内置检测器之上，添加您自己的词语和模式以进行脱敏、令牌化或拦截，合规预设一键即可启用。"
          },
          2: {
            a: "可以。使用您自己的 AI 密钥运行 WorkCoPilot，每一次调用都停留在该密钥上、在您自己的提供商关系之内，不会有任何内容被悄然改道。",
            d: "密钥经静态加密。"
          },
          4: {
            a: "不能。您屏幕上或任务中输入的任何内容都被视为关于工作的信息，绝不作为指令。任何试图使它违反规则或触及不属于您的数据的行为都会被拒绝，并记入您的活动日志。"
          }
        }
      },
      pricing: {
        items: {
          0: {
            a: "四个套餐：Lite、Basic、Advanced 和 Premium，每个套餐都含引导的主要任务和每月若干小时的实时引导。当前价格在定价页面上并排列出。"
          }
        }
      },
      current: {
        items: {
          1: {
            q: "它会从我的工作中学习吗，又有哪些内容它绝不保留？",
            a: "它会学习您的工具当前的运作方式，让下一个任务开始得更精准。习得内容经通用化和去标识化：绝不含个人数据、密钥、屏幕图像或文档内容。"
          }
        }
      },
      who: {
        items: {
          0: {
            a: "任何需要在屏幕上完成实际工作的人：工程师、IT 和安全专家、创始人、自由职业者、运营、财务和合规工作，以及日常事务。它在运营、技术、行政和动手类工作以及代码上最为擅长。"
          }
        }
      },
      compliance: {
        items: {
          1: {
            a: "每次会话的报告、一份审计日志和您的会话历史，经静态加密，保留至您将其删除，或某个保留窗口将其清除。原始屏幕帧、上传的源文档和真实的敏感值不会被存储。"
          }
        }
      },
      start: {
        items: {
          2: {
            a: "产品帮助和账单请发邮件至 {support}，隐私、法律或安全请发至 {legal}，其他事宜请发至 {sales}。我们将在一个工作日内回复。"
          }
        }
      }
    }
  },
  securityPage: {
    guarantees: {
      2: {
        d: "密码登录和社交账号登录均需通过同一道二次验证。"
      },
      5: {
        d: "可使用我们的 AI，也可使用您自己的 AI 密钥运行。只读模式：它只提供指引，绝不会更改您的系统。"
      }
    },
    facts: {
      retention: "<b>在您删除之前一直保留。</b> 您可以随时删除任何会话。还可设置自动保留期限，按计划清除较早的会话。"
    },
    compliance: {
      sub: "您为自己的账户启用一项策略，它便适用于每次会话。每次会话都会被记录，并可生成报告。带勾选标记的预设策略开箱即可启用。",
      honest: "我们提供管控措施和证据，但不声称已通过任何框架的认证；合规责任由您与您的审计方承担。"
    },
    contact: {
      issue: "<b>发现了安全问题？</b> 请发送邮件至 <a>support@admireveda.com</a>（安全、隐私、合规）。请在公开披露前给我们时间确认并修复；我们欢迎善意的安全研究。"
    }
  },
  contactPage: {
    lead: "关于 WorkCoPilot、您的套餐、安全、隐私或其他任何事情的问题。给我们留言，我们会尽快回复您。",
    form: {
      emailPlaceholder: "you@example.com",
      note: "如有安全、隐私或账单方面的问题，请在上方注明，相应负责人将予以回复。"
    },
    done: {
      body: "您的留言正在发往我们的途中，确认信也正发往 <b>{email}</b>。我们会尽快与您联系。"
    }
  },
  onboarding: {
    account: {
      emailPh: "you@example.com"
    }
  },
  widgets: {
    validate: {
      workEmailPh: "jordan@example.com"
    }
  },
  setPasswordPage: {
    foot: "每个账户都有强大的安全保护 · AdmireVeda WorkCoPilot"
  },
  helpPage: {
    desktopsec: {
      items: {
        3: "<b>发送的数据最少。</b> 为引导您，缩小后的屏幕帧和经过保护处理的文本会发送给 AI 服务（我们的，或您自己的密钥）。数据保护开启时，敏感值会在任何内容发送<b>之前</b>被剥离或令牌化，并在您的设备上重建。"
      }
    },
    redactShot: {
      caption: "数据保护开启后：敏感值会在任何内容离开您的设备之前，在设备上被剥离。"
    },
    flow: {
      steps: {
        answer: {
          d: "打开工具，然后选择 <b>回答</b>，再选择 <b>获取结果</b>。卡片会给出结果、它的置信度、它是如何得出的、如何验证它，以及任何政策标记。",
          alt: "回答卡片：结果、置信度指示条、我是如何得出的、验证方法、安全检查以及政策标记。"
        }
      }
    },
    record: {
      tip: "这份报告很适合作为下次的操作手册,或分享给需要执行同一任务的人。每张截图都在捕获前于您的设备上脱敏,仅存储经过脱敏处理的图像。"
    }
  },
  dashboardsHelp: {
    home: {
      lead: "仪表板是您的主页：一览您的套餐（本月小时数、增购、开放任务）、下一步要做的事，以及您上次中断的位置。",
      shot: {
        caption: "仪表板。橙色的“开始任务”卡片用于开始新工作；您的开放任务就在它下方。"
      },
      steps: {
        0: "<b>查看您的套餐。</b>三个方块分别显示本月剩余小时数、任何增购，以及您的开放任务名额。顶部的时间标签在用量不足前会转为琥珀色。",
        2: "<b>增加时间。</b>点按顶部的<b>增加时间</b>，购买增购小时数。"
      }
    }
  },
  workDashboard: {
    buy: {
      bodyMonth: "您的套餐时长将于 {date} 刷新。充值时长永不过期，可叠加在套餐之上。"
    },
    del: {
      note: "此操作会记入您账户的活动日志：何时删除、删除原因，以及该会话的内容。"
    },
    plan: {
      choose: "此账户尚无方案"
    }
  },
  workShell: {
    logs: {
      deleteNote: "此操作会记入您账户的活动日志：何时删除、删除原因，以及该会话的内容。"
    },
    noAccess: {
      body: "您的账户尚未开通 WorkCoPilot 访问权限。请联系支持，我们会为您解决。"
    }
  },
  workStart: {
    notReady: "现在先填好。等这项服务的 AI 设置完成，最后一步就会开放。",
    beginNotReady: "待这项服务的 AI 设置完成后，最后一步才会开放。",
    fSaasAppPh: "例如 Salesforce、Shopify"
  },
  workProjects: {
    gate: {
      title: "大型项目适用于 Premium"
    },
    inject: {
      ph: "例如：为门户设置双重验证登录"
    }
  },
  skillsPage: {
    note: {
      global: "<b>惠及所有人。</b>您添加的技能可能会以去标识化形式用于为所有用户改进 WorkCoPilot；个人数据会在存储前移除。您已在注册时同意此条款。"
    },
    lead: "技能会告诉 WorkCoPilot 您希望如何完成工作，使引导与您的工具、标准和术语保持一致。粘贴操作手册、SOP，或从任意 AI 导出的技能。"
  },
  guideConsole: {
    policy: {
      flag: "您的政策，{kind}：{title}"
    }
  },
  policyNote: {
    cleanBody: "此引导已对照您的安全政策进行检查，未发现任何需标记的问题。"
  }
}
