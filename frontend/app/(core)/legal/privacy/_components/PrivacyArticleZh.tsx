import Link from 'next/link';
import { LegalContactEmail, LegalFact } from '@/components/legal/LegalFact';
import { LegalZhArticle, LegalZhClauses, LegalZhList, LegalZhSection } from '@/components/legal/LegalZhDoc';
import { localizePathFromEnglish } from '@/lib/i18n/paths';
import type { PrivacyBodyProps } from './PrivacyArticle';

const linkClass = 'text-brand underline hover:text-brandHover';
const cell = 'px-3 py-2 align-top';

type DataRow = { type: string; items: string; purpose: string; basis: string };

const DATA_ROWS: DataRow[] = [
  { type: '账号信息', items: '邮箱地址、账号标识、登录凭证（由认证服务保存）、登录与会话记录', purpose: '注册登录、账号安全、与您联系', basis: '订立、履行合同所必需' },
  { type: '订单与支付信息', items: '订单号、充值金额、币种、支付状态、收据与钱包流水', purpose: '完成充值、扣费与退款、对账', basis: '订立、履行合同所必需；履行法定义务' },
  { type: '生成内容', items: '提示词、您上传的参考图片/视频/音频、生成结果、任务状态、所选模型与参数', purpose: '向您提供生成服务，在您的账号中保存历史记录', basis: '订立、履行合同所必需；含他人个人信息的素材另见第五条' },
  { type: '设备与日志信息', items: 'IP 地址、浏览器与设备类型、访问时间、请求记录、错误日志', purpose: '保障服务稳定与安全，排查故障', basis: '履行合同所必需；履行法定义务' },
  { type: '支付风控信息', items: '发起充值请求时的 IP 地址（经哈希处理后使用）和请求次数', purpose: '识别并限制异常的重复充值请求', basis: '履行合同所必需；保障交易安全' },
  { type: 'Cookie 与本地存储', items: '登录会话令牌、您对 Cookie 的选择记录', purpose: '保持登录状态、记住您的偏好', basis: '必要项：服务运行所必需；其他项：取得您的同意' },
  { type: '客服沟通信息', items: '您发送给我们的邮件内容及附件', purpose: '答复咨询、处理投诉与退款', basis: '您的请求；履行合同所必需' },
];

type ProcessorRow = { name: string; role: string; data: string };

const PROCESSOR_ROWS: ProcessorRow[] = [
  { name: '聚合易支付（LLM Hub Pay）', role: '支付', data: '订单号、金额、币种、支付结果' },
  { name: 'LLM Hub 接口（api.llmhub.com.cn）', role: '模型接口聚合，转发生成请求', data: '提示词、参考素材、任务标识' },
  { name: '阿里云 Model Studio（百炼）', role: '图像与视频生成', data: '提示词、参考素材、生成结果' },
  { name: '火山引擎方舟', role: '图像与视频生成', data: '提示词、参考素材、生成结果' },
  { name: 'Supabase', role: '账号认证与会话管理', data: '邮箱、认证凭证、会话与认证日志' },
  { name: '对象存储与内容分发服务', role: '保存上传素材与生成结果', data: '上传素材、生成结果' },
  { name: '服务器与数据库托管服务', role: '运行应用、保存业务数据', data: '账号、订单、任务数据与日志' },
];

export function PrivacyArticleZh({ links }: Pick<PrivacyBodyProps, 'links'>) {
  const termsHref = localizePathFromEnglish('zh', '/legal/terms');
  const refundHref = '/zh/return-policy';
  return (
    <LegalZhArticle>
      <LegalZhSection title="一、我们是谁">
        <LegalZhClauses
          items={[
            <>1.1 本政策说明 <LegalFact k="operatorName" />（<LegalFact k="operatorType" />，统一社会信用代码 <LegalFact k="creditCode" />，以下称“我们”）在您使用 <LegalFact k="productName" />（<LegalFact k="siteUrl" />）时，如何处理您的个人信息。我们是个人信息处理者。</>,
            <>1.2 注册地址：<LegalFact k="registeredAddress" />。网站备案号：<LegalFact k="icpFilingNumber" />。更多公示信息见<Link href={links.mentionsHref} className={linkClass}>运营者信息</Link>。</>,
            <>1.3 个人信息保护联系人：<LegalFact k="personalInfoContact" />，联系邮箱：<LegalContactEmail />。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="二、我们处理哪些个人信息，用于什么目的">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg-secondary text-left text-xs font-semibold text-text-secondary">
              <tr>
                <th scope="col" className={cell}>类型</th>
                <th scope="col" className={cell}>具体内容</th>
                <th scope="col" className={cell}>处理目的</th>
                <th scope="col" className={cell}>依据</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {DATA_ROWS.map((row) => (
                <tr key={row.type}>
                  <td className={`${cell} font-medium text-text-primary`}>{row.type}</td>
                  <td className={cell}>{row.items}</td>
                  <td className={cell}>{row.purpose}</td>
                  <td className={cell}>{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>我们仅为上述目的处理个人信息，处理范围限于实现目的所必需的最小范围。</p>
      </LegalZhSection>

      <LegalZhSection title="三、处理个人信息的依据">
        <LegalZhList
          items={[
            '订立、履行您作为一方当事人的合同所必需，例如注册账号、充值、生成和退款；',
            '取得您的同意，例如启用非必要的 Cookie、使用可选功能、上传含有他人个人信息的素材；',
            '履行法律、行政法规规定的义务，例如依法保存日志、配合有权机关的调查；',
            '法律、行政法规规定的其他情形。',
          ]}
        />
        <p>基于同意的处理，您可以随时撤回同意，撤回不影响此前已进行的处理。</p>
      </LegalZhSection>

      <LegalZhSection title="四、Cookie 与第三方统计">
        <LegalZhClauses
          items={[
            <>4.1 我们使用的 Cookie 和本地存储见<Link href={links.cookiesHref} className={linkClass}>Cookie 清单</Link>。必要项用于登录和保存您的选择，无法关闭。</>,
            <>4.2 截至本政策更新时，网站未启用第三方统计或广告工具。如果将来启用，只会在您同意后加载，并同步更新 Cookie 清单。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="五、您上传的素材中可能含有他人的个人信息">
        <LegalZhClauses
          items={[
            <>5.1 您上传的图片、视频、音频可能含有人脸、声音等信息。其中人脸、声音等可以识别特定自然人的信息，可能属于敏感个人信息。</>,
            <>5.2 请仅上传您有权使用的素材。素材涉及他人的，您应当事先取得该人的同意（涉及敏感个人信息的，应取得单独同意），并对此负责。</>,
            <>5.3 我们仅在提供您所请求的生成服务所必需的范围内处理这些素材。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="六、委托处理与共享">
        <LegalZhClauses
          items={[
            <>6.1 为提供服务，我们委托下列第三方处理部分信息。使用不同模型时，您的提示词和上传素材会被发送给相应模型的提供方处理。各方的处理地点见<Link href={links.subprocessorsHref} className={linkClass}>子处理方清单</Link>。</>,
            <>6.2 我们不会出售您的个人信息。除上述委托处理和法律法规要求外，未经您同意，我们不会向其他方提供您的个人信息。</>,
          ]}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg-secondary text-left text-xs font-semibold text-text-secondary">
              <tr>
                <th scope="col" className={cell}>第三方</th>
                <th scope="col" className={cell}>作用</th>
                <th scope="col" className={cell}>涉及的信息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {PROCESSOR_ROWS.map((row) => (
                <tr key={row.name}>
                  <td className={`${cell} font-medium text-text-primary`}>{row.name}</td>
                  <td className={cell}>{row.role}</td>
                  <td className={cell}>{row.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalZhSection>

      <LegalZhSection title="七、数据存放地点与出境">
        <LegalZhClauses
          items={[
            <>7.1 <LegalFact k="dataStorageStatement" />。</>,
            <>7.2 如将来需要向中华人民共和国境外提供个人信息，我们会依法向您告知接收方信息、处理目的和方式、行使权利的方式等，取得您的单独同意（需要时），并按照法律规定采取相应的合规路径后再提供。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="八、保存期限">
        <p>我们依法在实现处理目的所必需的最短期限内保存个人信息，法律、行政法规另有规定的除外。</p>
      </LegalZhSection>

      <LegalZhSection title="九、您的权利">
        <LegalZhClauses
          items={[
            <>9.1 您有权知悉、决定我们对您个人信息的处理，有权查阅、复制、更正、补充、删除您的个人信息，有权撤回同意、注销账号，并有权要求我们对个人信息处理规则作出说明。符合法律规定条件的，您还可以请求我们将个人信息转移至您指定的处理者。</>,
            <>9.2 请通过 <LegalContactEmail /> 提出请求，并说明您的账号邮箱。为保护账号安全，我们可能需要先核验您的身份。我们会依法及时答复；无法满足的，会说明理由。</>,
            <>9.3 注销账号后，我们会按第八条的期限删除或匿名化处理您的个人信息，法律要求保留的除外。未使用的钱包余额按<Link href={termsHref} className={linkClass}>《用户服务协议》</Link>和<Link href={refundHref} className={linkClass}>《退款与退换政策》</Link>处理。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十、未成年人">
        <LegalZhClauses
          items={[
            <>10.1 不满十四周岁未成年人的个人信息属于敏感个人信息。</>,
            <>10.2 监护人发现未成年人向我们提供了个人信息的，请通过联系邮箱告知，我们会尽快处理。</>,
          ]}
        />
      </LegalZhSection>

      <LegalZhSection title="十一、信息安全">
        <p>
          我们采取与服务风险相适应的安全措施，包括：网站全程使用 HTTPS 加密传输，账号数据需要登录后才能访问，对个人信息的访问实行权限控制。
          互联网上没有绝对安全的措施。发生或可能发生个人信息泄露、篡改、丢失时，我们会依法采取补救措施，并按规定通知您和有关主管部门。
        </p>
      </LegalZhSection>

      <LegalZhSection title="十二、本政策的更新">
        <p>
          我们可能因法律法规、监管要求或业务变化更新本政策，更新后的版本会在本页公布并注明生效日期和版本号。
          对您权利有重大影响的更新，我们会在您登录后提示，并请您确认。
        </p>
      </LegalZhSection>

      <LegalZhSection title="十三、联系与投诉">
        <p>
          如对本政策有疑问或想行使权利，请联系 <LegalFact k="personalInfoContact" />（<LegalContactEmail />）。
          您认为我们处理个人信息的行为损害了您的合法权益的，有权向有关主管部门投诉、举报，也可以依法向人民法院提起诉讼。
        </p>
      </LegalZhSection>
    </LegalZhArticle>
  );
}
