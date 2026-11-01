import Link from 'next/link';
import { LegalContactEmail, LegalFact } from '@/components/legal/LegalFact';
import { LegalZhArticle, LegalZhClauses, LegalZhList, LegalZhSection } from '@/components/legal/LegalZhDoc';
import { localizePathFromEnglish } from '@/lib/i18n/paths';

type TermsArticleZhProps = {
  version: string;
  effective: string | null;
  subprocessorsHref: string;
};

const linkClass = 'text-brand underline hover:text-brandHover';

/**
 * 用户服务协议（草案，需律师审阅）。凡只有运营者才知道的事实一律读取 config/legal-entity.json；
 * 运营者没有提供的事实不写入正文，对应条款已删除或改写。
 */
export function TermsArticleZh({ subprocessorsHref }: TermsArticleZhProps) {
  const privacyHref = localizePathFromEnglish('zh', '/legal/privacy');
  const aupHref = localizePathFromEnglish('zh', '/legal/acceptable-use');
  const takedownHref = localizePathFromEnglish('zh', '/legal/takedown');
  const cookiesHref = localizePathFromEnglish('zh', '/legal/cookies-list');
  const refundHref = '/zh/return-policy';

  return (
    <LegalZhArticle>
      <LegalZhSection title="一、协议的适用与接受">
        <LegalZhClauses
          items={[
            <>1.1 本协议是您与 <LegalFact k="operatorName" />（以下称“我们”）之间，关于您访问和使用 <LegalFact k="productName" /> 网站及相关服务（<LegalFact k="siteUrl" />，以下称“本服务”）的约定。</>,
            <>1.2 您注册账号、充值、提交生成任务，或以其他方式使用本服务，即表示您已阅读并同意本协议、<Link href={privacyHref} className={linkClass}>《隐私政策》</Link>、<Link href={aupHref} className={linkClass}>《可接受使用政策》</Link>和<Link href={refundHref} className={linkClass}>《退款与退换政策》</Link>。</>,
            <>1.3 如您不同意，请不要使用本服务。我们更新本协议时的处理方式见第十五条。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="二、运营者信息">
        <LegalZhList
          items={[
            <>运营者：<LegalFact k="operatorName" />（<LegalFact k="operatorType" />）</>,
            <>统一社会信用代码：<LegalFact k="creditCode" /></>,
            <>注册地址：<LegalFact k="registeredAddress" /></>,
            <>网站备案号：<LegalFact k="icpFilingNumber" /></>,
            <>联系邮箱：<LegalContactEmail /></>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="三、服务内容">
        <LegalZhClauses
          items={[
            <>3.1 本服务提供基于人工智能模型的图像、视频、音频生成与相关编辑工具，并采用先充值、按次扣费的钱包方式计费。</>,
            <>3.2 生成能力由第三方模型提供方提供。模型的可用范围、价格、参数和效果可能随提供方的变化而调整，我们会尽力在页面上标明，但不保证某一模型长期可用。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="四、账号与安全">
        <LegalZhClauses
          items={[
            <>4.1 您应提供真实、有效的注册信息，并及时更新。</>,
            <>4.2 您应妥善保管账号和密码，并对账号下发生的全部行为负责。发现账号被盗用或异常使用，请立即通过联系邮箱告知我们。</>,
            <>4.3 您不得出租、出借、转让或共享账号，不得以自动化方式批量注册或绕过限制获取服务。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="五、您的输入与上传内容">
        <LegalZhClauses
          items={[
            <>5.1 您提交的提示词、参考图片、视频、音频等（统称“输入内容”）应当来源合法，您拥有使用它们的权利，或已取得权利人的授权。</>,
            <>5.2 输入内容含有他人的肖像、声音、姓名、个人信息或受保护的作品时，您应当事先取得相应权利人的同意，并对由此产生的责任负责。</>,
            <>5.3 为向您提供生成服务，您授权我们在必要范围内存储、处理您的输入内容，并将其传输给您所选模型的提供方。传输与处理的对象见<Link href={subprocessorsHref} className={linkClass}>子处理方清单</Link>。</>,
            <>5.4 我们仅在提供本服务所必需的范围内使用您的输入内容。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="六、生成内容">
        <LegalZhClauses
          items={[
            <>6.1 “生成内容”指您通过本服务得到的图像、视频、音频等输出。生成内容是否构成作品、权利归谁，取决于适用的法律以及相关模型提供方的条款，我们不对此作出保证。</>,
            <>6.2 由于模型的工作方式，不同用户使用相同或相似的输入，可能得到相同或相似的输出。</>,
            <>6.3 生成内容可能不准确、不完整，或与您的预期不同。我们不保证其真实、合法、不侵犯第三方权利或适合某一商业用途。您在发布、传播或商用前，应自行核验，并对使用后果负责。</>,
            <>6.4 您不得将生成内容冒充为真实拍摄或真人创作，用于欺骗、误导他人。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="七、禁止行为">
        <p>您不得利用本服务输入、生成、存储或传播下列内容，也不得实施下列行为：</p>
        <LegalZhList
          items={[
            '危害国家安全、荣誉和利益，煽动颠覆国家政权、分裂国家，或宣扬恐怖主义、极端主义的；',
            '含有淫秽、色情、赌博、暴力、凶杀、恐怖内容，或教唆犯罪的；',
            '捏造、散布谣言，扰乱经济秩序和社会秩序，或进行诈骗的；',
            '侮辱、诽谤他人，侵害他人名誉、隐私、肖像、声音和个人信息权益的；',
            '侵犯他人著作权、商标权、专利权等知识产权，或其他合法权益的；',
            '冒充他人或机构，制作用于欺骗的深度合成内容的；',
            '涉及未成年人的不良内容，或可能损害未成年人身心健康的；',
            '攻击、破坏本服务或其计费、风控机制，或批量滥用、转售服务的；',
            '法律、行政法规禁止的其他内容和行为。',
          ]}
        />
        <p>
          违反上述规定的，我们可以视情节采取拒绝生成、删除内容、限制或终止账号等措施，并依法向有关主管部门报告。具体规则见
          <Link href={aupHref} className={linkClass}>《可接受使用政策》</Link>。
        </p>
      </LegalZhSection>

      <LegalZhSection title="八、人工智能生成内容的标识">
        <LegalZhClauses
          items={[
            <>8.1 您应遵守《互联网信息服务深度合成管理规定》等法律法规（以现行有效为准）和发布平台关于人工智能生成内容标识的要求。</>,
            <>8.2 您在抖音、小红书、快手等平台发布生成内容时，应按平台和法律的要求作出显著提示，不得删除、篡改或伪造生成内容中已有的标识。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="九、价格、钱包与支付">
        <LegalZhClauses
          items={[
            <>9.1 价格以人民币（CNY）计算。您在提交生成任务前，页面会显示本次任务的价格，您确认后才会扣费。</>,
            <>9.2 充值通过 <LegalFact k="paymentProvider" /> 完成。支付结果以支付机构通知并经我们核对后为准。</>,
            <>9.3 钱包为预付费方式：您先充值，再在使用本服务时按页面所示价格扣费。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十、生成失败与退款">
        <LegalZhClauses
          items={[
            <>10.1 因本服务一侧或模型提供方的原因导致生成任务失败的，相关费用会自动退回您的钱包。</>,
            <>10.2 其他退款事宜，请通过联系邮箱与我们联系，具体见<Link href={refundHref} className={linkClass}>《退款与退换政策》</Link>。法律法规对消费者另有强制性规定的，从其规定。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十一、服务的变更、中断与终止">
        <LegalZhClauses
          items={[
            <>11.1 因系统维护、第三方服务异常、网络或不可抗力等原因，本服务可能出现中断或延迟。我们会尽合理努力恢复，并在可行时提前公告。</>,
            <>11.2 您违反本协议或法律法规的，我们可以限制或终止您的账号。终止后，未使用余额的处理按第九条和第十条的规则办理。</>,
            <>11.3 您可以随时停止使用本服务，并通过联系邮箱申请注销账号，个人信息的处理见<Link href={privacyHref} className={linkClass}>《隐私政策》</Link>。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十二、知识产权">
        <LegalZhClauses
          items={[
            <>12.1 本服务的软件、界面、文字、图形等内容的知识产权，归运营者或相应权利人所有。未经许可，您不得复制、修改、反向工程或用于其他商业目的。</>,
            <>12.2 本服务中展示的第三方模型名称、商标，归其各自权利人所有。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十三、侵权投诉与内容举报">
        <p>
          您认为本服务上的内容侵犯了您的合法权益，或发现违法违规内容的，可以按<Link href={takedownHref} className={linkClass}>《通知与下架》</Link>
          提供权属证明、侵权内容位置等材料，向 <LegalContactEmail /> 投诉。我们收到合格通知后会依法及时处理。
        </p>
      </LegalZhSection>

      <LegalZhSection title="十四、免责声明与责任限制">
        <LegalZhClauses
          items={[
            <>14.1 在法律允许的范围内，对于因第三方服务、网络、不可抗力或您自身原因造成的损失，我们不承担责任。</>,
            <>14.2 在法律允许的范围内，我们对您使用本服务产生的间接损失、利润损失不承担责任，我们承担的赔偿责任以您就导致损失的那次服务实际支付的费用为限。</>,
            <>14.3 本条不排除或限制我们因故意或重大过失造成他人损失，或造成他人人身伤害，以及法律不允许排除的责任。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十五、协议的变更">
        <LegalZhClauses
          items={[
            <>15.1 我们可以根据法律法规、监管要求或业务调整修改本协议，修改后的版本会在本页公布并注明生效日期和版本号。</>,
            <>15.2 对您权利义务有重大影响的修改，我们会在您登录后提示，并请您确认接受新版本（见“法律更新确认”页面）。您不同意的，可以停止使用并申请注销账号。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十六、法律适用与争议解决">
        <LegalZhClauses
          items={[
            <>16.1 本协议的订立、效力、解释、履行和争议解决，适用<LegalFact k="governingLaw" />。</>,
            <>16.2 因本协议产生的争议，双方应先友好协商；协商不成的，由<LegalFact k="disputeForum" />。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十七、联系我们">
        <p>
          对本协议有疑问，请联系 <LegalContactEmail />。个人信息相关事宜，请联系 <LegalFact k="personalInfoContact" />，
          渠道为同一邮箱。Cookie 与第三方技术说明见<Link href={cookiesHref} className={linkClass}>Cookie 清单</Link>。
        </p>
      </LegalZhSection>
    </LegalZhArticle>
  );
}
