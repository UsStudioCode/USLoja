// src/components/AuthLayout.jsx
'use client';

import React from 'react';
import Image from "next/image";
import { BiStar } from "react-icons/bi";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import '../../styles/login.css'; // Mantém o estilo original do login

export default function AuthLayout({ children, title, subtitle }) {

  return (
    <main>
      <div className="mgt-login">
        
        <div className="text-sect">
          <div className="text-inside">
            {children}
          </div>
        </div>

        <div className="img-sect">
          <div className="img-case">
            <Image sizes="400px" priority fill alt="Image" src="/login.jpg" className="img-it" />
          </div>
          <div className="text-case">
            <div className="text-s">
              <p className="weve"> 
                {"“A integrar tecnologia no coração do Guiné-Bissau é nossa esperança na Orange Digital, e chegaremos lá”"} 
              </p>
              <div className="weve-bot">
                <div className="weve-left">
                  <p className="founder">Equipa M.B</p>
                  <p className="founder-words">Founder, Catalog</p>
                  <p className="founder-words-gd">Orange Summer Challenge (OSC)</p>
                </div>
                <div className="weve-right">
                  <div> 
                    {[1, 2, 3, 4, 5].map((e, i) => ( 
                      <BiStar key={i} color="#b4b5b4bf" /> 
                    ))} 
                  </div>
                  <div className="weve-circles"> 
                    <div className="ocircle oleft"><BsArrowLeft /></div> 
                    <div className="ocircle oright"><BsArrowRight /></div> 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}