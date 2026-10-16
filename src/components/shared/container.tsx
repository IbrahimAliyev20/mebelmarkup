import React from 'react'

function Container({ children,className }: { children: React.ReactNode,className?: string }) {
  return (
    <div className={`max-w-[1440px] mx-auto md:px-[80px] px-4 ${className}`}>
        {children}
    </div>
  )
}

export default Container