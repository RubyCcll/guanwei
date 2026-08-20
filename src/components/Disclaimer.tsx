// 免责声明（观微三戒）
export default function Disclaimer({ text }: { text?: string }) {
  return (
    <div className="disclaimer" role="note">
      <span className="seal-mini">慎</span>
      <div>
        <strong>观微三戒：</strong>
        {text ?? '凡占问所得，皆为先贤智慧之投影，仅供修身养性、怡情遣兴之用，不构成任何决策依据。心诚则灵，勿迷勿执；大事不决，请询人事、法律或专业人士。'}
      </div>
    </div>
  );
}