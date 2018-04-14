import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ToolService } from './tool.service';
declare var log;

@Component({
  selector: 'eula',
  template: `
<div style="text-align: center; margin-bottom: 50px;">
  <h1>Atomic Fishbowl</h1>
  <h2>End User License Agreement</h2>

  <div style="text-align: left;">

<p>1. Preamble: Please read this End­ User License Agreement ("Agreement") carefully before using Atomic Fishbowl ("Software").  By using the Software, you are agreeing to be bound by the terms and conditions of this Agreement.  If you do not agree to the terms of this Agreement, do not use the Software.  This Agreement sets the terms, rights, restrictions and obligations on using Atomic Fishbowl ("Software") created and owned by Licensor, as detailed herein.</p>

<p>2. License Grant: Kensington Technology Associates, Limited ("Licensor"), a Colorado Limited Liability Company, hereby grants You ("Licensee") a Personal, Non-assignable & non-transferable, Temporary, Commercial, Royalty free, Without the rights to create derivative works, Non-exclusive license, all with accordance with the terms set forth and other legal restrictions set forth in 3rd party software used while running Software.<br>
&nbsp;&nbsp;2.1 Limited: Licensee may use Software for the purpose of:<br>
&nbsp;&nbsp;&nbsp;&nbsp;2.1.1 Running Software on Licensee’s Server[s];<br>
&nbsp;&nbsp;&nbsp;&nbsp;2.1.2 Publishing Software’s output to Licensee;<br>
&nbsp;&nbsp;2.2 The Software shall only be used for testing and evaluation purposes.<br>
&nbsp;&nbsp;2.3 Binary Restricted: Licensee may sublicense Software as a part of a larger work containing more than Software, distributed solely in Object or Binary form under a personal, non-sublicensable, limited license. Such redistribution shall be limited to unlimited codebases.<br>
&nbsp;&nbsp;2.4 Non Assignable & Non-Transferable: Licensee may not assign or transfer his rights and duties under this license.<br>
&nbsp;&nbsp;2.5 Commercial, Royalty Free: Licensee may use Software for stated purposes, without any royalties</p>

<p>3.  Reverse Engineering: Licensee will not reverse engineer, decompile, disassemble or otherwise attempt to derive the source code, techniques, processes, algorithms, know-how or other information from the binary code portions of the Software (collectively, "Reverse Engineering") or permit or induce the foregoing. If however, directly applicable law prohibits enforcement of the foregoing, Licensee may engage in Reverse Engineering solely for purposes of obtaining such information as is necessary to achieve interoperability of independently created software with the Software, or as otherwise and to the limited extent permitted by directly applicable law, but only if: (a) Reverse Engineering is strictly necessary to obtain such information; and (b) Licensee has first requested such information from Licensor and Licensor failed to make such information available (for a fee or otherwise) under reasonable terms and conditions. Any information supplied to or obtained by Licensee under this section is confidential information of Licensor, and may only be used by Licensee for the purpose described in this section, and will not be disclosed to any third party or used to create any software which is substantially similar to the expression of the Software Technology.</p>

<p>4. Term & Termination: The Term of this license shall be until terminated or until the license expires.<br>
&nbsp;&nbsp;4.1 Licensor may terminate this Agreement, including Licensee’s license in the case where Licensee :<br>
&nbsp;&nbsp;&nbsp;&nbsp;4.1.1 became insolvent or otherwise entered into any liquidation process; or<br>
&nbsp;&nbsp;&nbsp;&nbsp;4.1.2 exported The Software to any jurisdiction where licensor may not enforce his rights under this agreements in; or<br>
&nbsp;&nbsp;&nbsp;&nbsp;4.1.3 Licensee was in breach of any of this license's terms and conditions and such breach was not cured, immediately upon notification; or<br>
&nbsp;&nbsp;&nbsp;&nbsp;4.1.4 Licensee in breach of any of the terms of clause 2 to this license; or<br>
&nbsp;&nbsp;&nbsp;&nbsp;4.1.5 Licensee otherwise entered into any arrangement which caused Licensor to be unable to enforce his rights under this License.<br>
&nbsp;&nbsp;4.2 This license expires 90 days from the date of installation, at 12:01am Eastern Standard Time. This license shall be considered to be terminated at this date and time, and all rights, privileges, and entitlements assigned by this license shall be null and void.</p>

<p>5. Payment: In consideration of the temporary License granted under clause 2, Licensee may not pay Licensor a fee.</p>

<p>6. Upgrades, Updates and Fixes: Licensor may provide Licensee, from time to time, with Upgrades, Updates or Fixes, as detailed herein and according to his sole discretion. Licensee hereby warrants to keep The Software up-to-date and install all relevant updates and fixes, and may, at his sole discretion, purchase upgrades, according to the rates set by Licensor. Licensor shall provide any update or Fix free of charge; however, nothing in this Agreement shall require Licensor to provide Updates or Fixes.<br>
&nbsp;&nbsp;6.1 Upgrades: for the purpose of this license, an Upgrade shall be a material amendment in The Software, which contains new features and or major performance improvements and shall be marked as a new version number. For example, should Licensee purchase The Software under version 1.X.X, an upgrade shall commence under number 2.0.0.<br>
&nbsp;&nbsp;6.2 Updates: for the purpose of this license, an update shall be a minor amendment in The Software, which may contain new features or minor improvements and shall be marked as a new sub-version number. For example, should Licensee purchase The Software under version 1.1.X, an upgrade shall commence under number 1.2.0.<br>
&nbsp;&nbsp;6.3 Fix: for the purpose of this license, a fix shall be a minor amendment in The Software, intended to remove bugs or alter minor features which impair the The Software's functionality. A fix shall be marked as a new sub-sub-version number. For example, should Licensee purchase Software under version 1.1.1, an upgrade shall commence under number 1.1.2.</p>

<p>7. Support: Software is provided under an AS-IS basis and without any support, updates or maintenance. Nothing in this Agreement shall require Licensor to provide Licensee with support or fixes to any bug, failure, mis-performance or other defect in The Software.<br>
&nbsp;&nbsp;7.1 Bug Notification: Licensee may provide Licensor of details regarding any bug, defect or failure in The Software promptly and with no delay from such event; Licensee shall comply with Licensor's request for information regarding bugs, defects or failures and furnish him with information, screenshots and try to reproduce such bugs, defects or failures.<br>
&nbsp;&nbsp;7.2 Feature Request: Licensee may request additional features in Software, provided, however, that (i) Licensee shall waive any claim or right in such feature should feature be developed by Licensor; (ii) Licensee shall be prohibited from developing the feature, or disclose such feature request, or feature, to any 3rd party directly competing with Licensor or any 3rd party which may be, following the development of such feature, in direct competition with Licensor; (iii) Licensee warrants that feature does not infringe any 3rd party patent, trademark, trade-secret or any other intellectual property right; and (iv) Licensee developed, envisioned or created the feature solely by himself.</p>

<p>8. Liability:  To the extent permitted under Law, The Software is provided under an AS-IS basis. Licensor shall never, and without any limit, be liable for any damage, cost, expense or any other payment incurred by Licensee as a result of Software’s actions, failure, bugs and/or any other interaction between The Software  and Licensee’s end-equipment, computers, other software or any 3rd party, end-equipment, computer or services.  Moreover, Licensor shall never be liable for any defect in source code written by Licensee when relying on The Software or using The Software’s source code.</p>

<p>9. Warranty:
&nbsp;&nbsp;9.1 Intellectual Property: Licensor hereby warrants that The Software does not violate or infringe any 3rd party claims in regards to intellectual property, patents and/or trademarks and that to the best of its knowledge no legal action has been taken against it for any infringement or violation of any 3rd party intellectual property rights.<br>
&nbsp;&nbsp;9.2 No-Warranty: The Software is provided without any warranty; Licensor hereby disclaims any warranty that The Software shall be error free, without defects or code which may cause damage to Licensee’s computers or to Licensee, and that Software shall be functional. Licensee shall be solely liable to any damage, defect or loss incurred as a result of operating software and undertake the risks contained in running The Software on License’s Server[s] and Website[s].<br>
&nbsp;&nbsp;9.3 Prior Inspection: Licensee hereby states that he inspected The Software thoroughly and found it satisfactory and adequate to his needs, that it does not interfere with his regular operation and that it does meet the standards and scope of his computer systems and architecture. Licensee found that The Software interacts with his development, website and server environment and that it does not infringe any of End User License Agreement of any software Licensee may use in performing his services. Licensee hereby waives any claims regarding The Software's incompatibility, performance, results and features, and warrants that he inspected the The Software.</p>

<p>10. No Refunds: Licensee warrants that he inspected The Software according to clause 9.3 and that it is adequate to his needs. Accordingly, as The Software is intangible goods, Licensee shall not be, ever, entitled to any refund, rebate, compensation or restitution for any reason whatsoever, even if The Software contains material flaws.</p>

<p>11. Indemnification: Licensee hereby warrants to hold Licensor harmless and indemnify Licensor for any lawsuit brought against it in regards to Licensee’s use of The Software in means that violate, breach or otherwise circumvent this license, Licensor's intellectual property rights or Licensor's title in The Software. Licensor shall promptly notify Licensee in case of such legal action and request Licensee’s consent prior to any settlement in relation to such lawsuit or claim.</p>

<p>12. Governing Law, Jurisdiction: Licensee hereby agrees not to initiate class-action lawsuits against Licensor in relation to this license and to compensate Licensor for any legal fees, cost or attorney fees should any claim brought by Licensee against Licensor be denied, in part or in full.</p>

  </div>
  <button pButton type="button" (click)="onAccept()" label="I Agree"></button>
</div>
  `,
  styles: [``]
})

export class EulaComponent {

  constructor(private toolService: ToolService) {}

  onAccept(): void {
    this.toolService.setPreference('eulaAccepted', true);
    this.toolService.eulaAccepted.next();
  }

}
