// Edition wording overlay: ORGANIZATIONS, locale zh. Same keys as en.js
// of this folder (gate: scripts/check-edition-copy.mjs); index-keyed objects
// patch single list elements (src/i18n/overlay_merge.js).
export default {
  common: {
    getStarted: "联系我们"
  },
  seo: {
    pricing: {
      title: "组织方案 - WorkCoPilot by AdmireVeda",
      description: "WorkCoPilot 组织方案：AdmireVeda 托管、AdmireVeda 代管，或部署在您自己云中的私有实例。至少 100 位用户起，按每用户每月计价，含公司策略、单点登录和引导小时池。联系我们。"
    }
  },
  home: {
    meta: {
      title: "WorkCoPilot by AdmireVeda - 让整个组织的工作都有引导",
      description: "WorkCoPilot 在团队每个人的真实屏幕上、在您自己的应用里一步步引导，并把敏感数据留在他们的设备上。Company Brain、教授工作流程和公司策略，可托管，也可部署在您自己的环境中。"
    },
    badge: "面向组织",
    hero: [
      {
        h: "团队里的每个人，都被<em>引导到完成</em>。",
        s: "它读取每个人的屏幕，在您自己的应用里给出确切的下一步，并在走错一步的那一刻发现它。"
      },
      {
        h: "您的专业知识，<em>融入每一步</em>。",
        s: "Company Brain 与教授工作流程把您自己的操作手册融入引导，仅贵公司私有。"
      },
      {
        h: "<em>设计即治理</em>，在每台设备上脱敏。",
        s: "由您启用并锁定的公司策略、单点登录，以及在发送任何内容之前就被剥离的敏感数据。"
      }
    ],
    cta: {
      start: "联系我们"
    },
    cues: [
      "在您的员工已经在用的应用里直接工作",
      "只读：绝不替任何人点击或运行任何东西",
      "可托管，也可部署在您自己的环境中"
    ],
    pricing: {
      eyebrow: "方案",
      h2: "面向组织的方案。",
      sub: "AdmireVeda 托管、AdmireVeda 代管，或部署在您自己云中的私有实例。按每用户每月计价，费率由公司规模决定。",
      fullCompare: "查看组织方案"
    },
    final: {
      h2: "把有引导的工作带进您的组织。",
      p: "和我们聊聊团队的推广部署，或先看 60 秒演示。",
      note2: "用公司账户登录，或用工作邮箱登录以使用公司单点登录。<a>企业版登录</a>。"
    }
  },
  login: {
    meta: {
      title: "登录 - WorkCoPilot by AdmireVeda",
      description: "用公司账户或公司单点登录进入 WorkCoPilot，在您自己的屏幕上获得分步引导。"
    },
    pitchP: "WorkCoPilot 观察每一块屏幕，告诉您的员工确切的下一步，并在走错一步让您付出代价之前就发现它。它会学习您自己的应用和操作手册，仅贵公司私有。",
    newWeb: "第一次用 WorkCoPilot？<a>在 admireveda.com 联系我们</a>"
  },
  pricing: {
    eyebrow: "组织方案",
    h1: "有引导的工作，<em>覆盖您的整个组织。</em>",
    sub: "选择 WorkCoPilot 的运行方式：AdmireVeda 托管、AdmireVeda 代管，或部署在您自己云中的私有实例。安全与隐私随每个方案附带，绝不作为加购项。",
    notes: {
      items: [
        {
          t: "按人计价",
          d: "每个方案按每用户每月计价，公司规模决定每位用户的费率。另附由公司管理员分配的引导小时池。"
        },
        {
          t: "按分钟，不按整块",
          d: "引导时间按实际使用的分钟计算，绝不向上取整到小时。"
        },
        {
          t: "您的推广部署",
          d: "有专人负责您的推广部署，并在员工开始使用前配置好单点登录和公司策略。"
        },
        {
          t: "贴合公司采购方式",
          d: "符合贵公司采购方式的合同、一份 DPA，以及可在公司控制台下载的发票。"
        }
      ]
    },
    fine: "最终条款以合同为准。税费可能因地区而异。"
  },
  howItWorks: {
    cta: {
      start: "联系我们"
    }
  },
  faqPage: {
    getStarted: "联系我们",
    groups: {
      how: {
        items: {
          2: {
            d: "您还可上传参考文档以作为步骤的依据；在桌面应用上，文件绝不会离开您的设备。"
          }
        }
      },
      pricing: {
        items: {
          0: {
            a: "WorkCoPilot 面向组织销售，至少 100 位用户起，按每用户每月计价：AdmireVeda 托管、AdmireVeda 代管（AI 另按实际用量计费），或部署在您自己云中的私有实例。公司规模决定每位用户的费率。联系我们。",
            d: "AdmireVeda 根据合同向贵公司开具发票；发票可在公司控制台中查看。"
          }
        }
      },
      compliance: {
        items: {
          3: {
            a: "摘要版 DPA 已公开，签署版 DPA 可应要求提供。引导由一家主要 AI 提供商生成，托管由一家云提供商提供；含实体名称的当前列表可应要求提供。"
          }
        }
      },
      start: {
        items: {
          0: {
            a: "联系我们，为贵公司部署 WorkCoPilot。管理员把您添加进来，或您用公司单点登录后，说出您想完成什么，它便会在您的屏幕上开始引导您。无需安装。",
            links: [
              "登录",
              "查看组织方案"
            ]
          }
        }
      }
    }
  },
  fieldsPage: {
    startBtn: "引入您的团队"
  },
  securityPage: {
    guarantees: {
      2: {
        t: "每次登录都需第二重验证",
        d: "密码登录要求每个账户都使用身份验证器应用；公司单点登录则沿用您的身份提供商所要求的第二重验证。"
      }
    },
    mock: {
      fields: {
        2: "银行账户"
      }
    }
  },
  useCases: {
    final: {
      cta: "联系我们"
    }
  },
  demoPage: {
    startFree: "联系我们",
    heroNote: "大约一分钟即可看完。"
  },
  workDashboard: {
    plan: {
      choose: "此账户尚无方案"
    },
    meters: {
      sub: "本月时长、公司资源池和进行中的任务。将鼠标悬停在卡片的说明上，了解其运作方式。"
    }
  },
  dashboardsHelp: {
    home: {
      lead: "仪表板是您的主页：本月小时数和公司资源池、开放任务、下一步要做的事，以及您上次中断的位置。",
      steps: {
        0: "<b>查看您的套餐。</b>三个方块分别显示本月剩余小时数、您的公司资源池，以及您的开放任务名额。顶部的时间标签在用量不足前会转为琥珀色。",
        2: "<b>增加时间。</b>点按顶部的<b>增加时间</b>，向您的管理员申请更多小时数。"
      }
    }
  }
}
