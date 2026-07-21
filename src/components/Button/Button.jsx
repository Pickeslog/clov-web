import './Button.css'

/**
 * 공통 버튼.
 * @param variant 'primary' | 'secondary' | 'danger' | 'action' | 'dashed'
 * @param size    'sm' | 'md' | 'lg'
 * @param as      렌더 태그(기본 'button'). 'a' 등으로 바꿀 수 있다.
 * 나머지 props(onClick·disabled·type·title 등)는 그대로 전달된다.
 */
export default function Button({ variant = 'primary', size = 'md', as: Comp = 'button', className = '', children, ...props }) {
  const type = Comp === 'button' && props.type === undefined ? 'button' : props.type
  return (
    <Comp className={`clov-btn clov-btn--${variant} clov-btn--${size} ${className}`.trim()} {...props} type={type}>
      {children}
    </Comp>
  )
}
