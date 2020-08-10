import React from 'react'

import {Container, Image, Text} from './styles'
import {from} from "../../Utils";

export default function Greetings(): JSX.Element {
    return (
        <Container>
            <Image
                src="https://www.vectorlogo.zone/logos/reactjs/reactjs-icon.svg"
                alt="ReactJS logo"
            />
            <Text>TypeScript Electron & React ^_^</Text>
            <p>{from(0).to(100).map(i => `${i}, `)}</p>
        </Container>
    )
}