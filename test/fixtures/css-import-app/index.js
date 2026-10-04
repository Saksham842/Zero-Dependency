import cssContent from './styles.css';

export function getCssMeta() {
  return {
    hasCard: cssContent.includes('.card'),
    hasBtn: cssContent.includes('.btn-primary'),
    length: cssContent.length
  };
}
